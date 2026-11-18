import JSZip from 'jszip';
import { crearMesaDeTrabajo } from './generarPdfFicha';
import { capturarHoja, pdfDesdeCanvas, nombreArchivoFicha } from '../../utils/pdfFicha';

const carpeta = (t) =>
  String(t || 'Sin colonia')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]+/g, '')
    .trim() || 'Sin colonia';

/**
 * Genera un PDF por ficha (mismo diseño que "Descargar planilla") y los junta en un ZIP.
 * Si hay más de una colonia, cada una va en su carpeta.
 * onProgreso(hechas, total) se llama después de cada ficha; si debeCancelar() da true, corta y devuelve null.
 */
export async function generarZipFichas(fichas, { onProgreso, debeCancelar } = {}) {
  const zip = new JSZip();
  const variasColonias = new Set(fichas.map((f) => f.colonia_id)).size > 1;
  const usados = new Set();
  // Una sola mesa de trabajo para todas: la planilla sale siempre horizontal
  const mesa = crearMesaDeTrabajo('horizontal');

  try {
    for (let i = 0; i < fichas.length; i++) {
      if (debeCancelar?.()) return null;
      const f = fichas[i];

      const hoja = mesa.dibujar(f);
      // eslint-disable-next-line no-await-in-loop
      const canvas = await capturarHoja(hoja, { escala: 1.4, dosPasadas: i === 0 });
      const pdf = pdfDesdeCanvas(canvas, { calidad: 0.75 });

      let nombre = nombreArchivoFicha({ apellido_nombre: f.nino_nombre, dni: f.nino_dni });
      if (variasColonias) nombre = `${carpeta(f.colonia_nombre)}/${nombre}`;
      let unico = nombre;
      for (let n = 2; usados.has(unico); n++) unico = nombre.replace(/\.pdf$/, `_${n}.pdf`);
      usados.add(unico);

      zip.file(unico, pdf.output('arraybuffer'));
      onProgreso?.(i + 1, fichas.length);
      // Ceder el hilo para que la barra de progreso se actualice
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    mesa.cerrar();
  }

  // Los PDF ya vienen comprimidos: STORE es mucho más rápido y pesa casi lo mismo
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}
