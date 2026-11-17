import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import JSZip from 'jszip';
import FichaMedicaVerticalView from './FichaMedicaVerticalView';
import { pdfHorizontalDesdeElemento, nombreArchivoFicha } from '../../utils/pdfFicha';

const esperarImagenes = (el) =>
  Promise.all(
    Array.from(el.querySelectorAll('img')).map((img) =>
      img.complete && img.naturalWidth > 0
        ? null
        : new Promise((r) => {
            img.onload = img.onerror = r;
          })
    )
  );

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

  // Contenedor fuera de pantalla con ancho de PC para que la planilla salga siempre horizontal
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'fixed', left: '-20000px', top: '0', width: '1200px', background: '#fff', pointerEvents: 'none' });
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    for (let i = 0; i < fichas.length; i++) {
      if (debeCancelar?.()) return null;
      const f = fichas[i];

      flushSync(() => root.render(<FichaMedicaVerticalView ficha={f} soloPlanilla layout="horizontal" />));
      const hoja = host.querySelector('.ficha-oficial-sheet');
      await esperarImagenes(hoja);

      const pdf = await pdfHorizontalDesdeElemento(hoja, { escala: 1.4, calidad: 0.75 });

      let nombre = nombreArchivoFicha({ apellido_nombre: f.nino_nombre, dni: f.nino_dni });
      if (variasColonias) nombre = `${carpeta(f.colonia_nombre)}/${nombre}`;
      let unico = nombre;
      for (let n = 2; usados.has(unico); n++) unico = nombre.replace(/\.pdf$/, `_${n}.pdf`);
      usados.add(unico);

      zip.file(unico, pdf.output('arraybuffer'));
      onProgreso?.(i + 1, fichas.length);
      // Ceder el hilo para que la barra de progreso se actualice
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    root.unmount();
    host.remove();
  }

  // Los PDF ya vienen comprimidos: STORE es mucho más rápido y pesa casi lo mismo
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}
