import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ─────────────────────────────────────────────────────────────────────────────
// Por qué se juntaban las palabras en el PDF:
// html2canvas copia la página en un iframe oculto, mide ahí la posición de cada palabra
// y después las dibuja con la fuente de la página. Si en ese iframe la fuente (Roboto, de
// Google Fonts) todavía no había bajado, medía con la de reserva (Arial, más angosta) y
// dibujaba con Roboto (más ancha): las palabras se pisaban y desaparecían los espacios.
// `fonts.ready` no alcanza: se resuelve enseguida si el navegador todavía no empezó a bajarlas.
// Solución: antes de medir, pedir explícitamente cada fuente que usa la hoja y esperarla,
// tanto en la página como en la copia.
// ─────────────────────────────────────────────────────────────────────────────

function fuentesUsadas(raiz) {
  const win = raiz.ownerDocument.defaultView;
  const set = new Set();
  for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
    const cs = win.getComputedStyle(el);
    const familia = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
    if (familia) set.add(`${cs.fontStyle === 'italic' ? 'italic ' : ''}${cs.fontWeight} 16px "${familia}"`);
  }
  return [...set];
}

async function esperarHojasDeEstilo(doc) {
  const links = [...doc.querySelectorAll('link[rel="stylesheet"]')];
  await Promise.all(
    links.map((l) => {
      if (l.sheet) return null;
      return new Promise((r) => {
        l.addEventListener('load', r, { once: true });
        l.addEventListener('error', r, { once: true });
        setTimeout(r, 4000);
      });
    })
  );
}

/** Espera a que estén cargadas todas las fuentes que usa `raiz` dentro de su documento. */
export async function esperarFuentes(raiz) {
  const doc = raiz.ownerDocument;
  if (!doc.fonts) return;
  await esperarHojasDeEstilo(doc);
  const fuentes = fuentesUsadas(raiz);
  await Promise.race([
    Promise.all(fuentes.map((f) => doc.fonts.load(f).catch(() => null))),
    new Promise((r) => setTimeout(r, 6000)) // sin red, no colgar la descarga
  ]);
  await doc.fonts.ready;
  // Un instante para que el navegador vuelva a calcular el texto con la fuente ya cargada.
  // (setTimeout y no requestAnimationFrame: este último se frena si la pestaña está en segundo plano)
  await new Promise((r) => setTimeout(r, 30));
}

/**
 * html2canvas con las fuentes garantizadas en la página y en la copia interna.
 * `alClonar(docClon, elClon)` permite ajustar la copia (como el onclone de html2canvas).
 */
export async function capturarFicha(element, { alClonar, ...opciones } = {}) {
  await esperarFuentes(element);
  return html2canvas(element, {
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    ...opciones,
    onclone: async (docClon, elClon) => {
      // html2canvas no sabe dibujar "font-variant-numeric" (la app usa números de ancho fijo):
      // mediría los números con un ancho y los dibujaría con otro, dejando huecos en fechas
      // y presiones ("2014 -11 -05"). En la copia se usan números normales.
      const estilo = docClon.createElement('style');
      estilo.textContent = '* { font-variant-numeric: normal !important; font-feature-settings: normal !important; }';
      docClon.head.appendChild(estilo);
      if (alClonar) await alClonar(docClon, elClon);
      await esperarFuentes(elClon);
    }
  });
}

// Planilla horizontal (A4 apaisado, una sola página con ajuste proporcional).
// La usan la descarga individual en PC y el ZIP con todas las fichas.
export async function pdfHorizontalDesdeElemento(element, { escala = 2, calidad = 0.88 } = {}) {
  const canvas = await capturarFicha(element, { scale: escala, windowWidth: 1200 });

  const imgData = canvas.toDataURL('image/jpeg', calidad);
  const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4', compress: true });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 6;

  const ratio = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
  const finalWidth = canvas.width * ratio;
  const finalHeight = canvas.height * ratio;

  pdf.addImage(imgData, 'JPEG', (pageWidth - finalWidth) / 2, (pageHeight - finalHeight) / 2, finalWidth, finalHeight, undefined, 'FAST');
  // Liberar memoria del canvas enseguida (importante al generar cientos)
  canvas.width = 0;
  canvas.height = 0;
  return pdf;
}

export function nombreArchivoFicha(nino) {
  const limpio = (t) =>
    String(t || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  return `Ficha_Medica_${limpio(nino?.apellido_nombre) || 'Colonia'}_DNI_${limpio(nino?.dni) || 'sin_dni'}.pdf`;
}
