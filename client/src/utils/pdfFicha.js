import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

// ─────────────────────────────────────────────────────────────────────────────
// Cómo se arma el PDF de la ficha
//
// Antes se usaba html2canvas, que vuelve a calcular a mano dónde va cada palabra y la
// dibuja en un canvas. En algunos Chrome ese cálculo no coincide con la fuente real y
// el PDF salía con las palabras pegadas y sin ":", "," "." ni "-".
//
// Ahora la hoja la dibuja el propio navegador (html-to-image: la hoja se mete en un SVG
// y el navegador la pinta con su motor normal), así que el PDF sale igual que la pantalla.
// Para que use las mismas letras, las fuentes de Google se incrustan en el SVG.
// ─────────────────────────────────────────────────────────────────────────────

let promesaFuentes = null;

function aDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

/**
 * CSS con las fuentes de la app incrustadas (solo el juego "latin", que alcanza para el español:
 * tildes, ñ, ¿, º). Se arma una sola vez y se reutiliza para todas las fichas.
 * Si no se puede (sin internet), devuelve '' y el PDF sale con letras del sistema pero bien espaciado.
 */
async function cssFuentesIncrustadas() {
  if (!promesaFuentes) {
    promesaFuentes = (async () => {
      const hrefs = [...document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')]
        .map((l) => l.href)
        .filter((h) => !/Material/i.test(h)); // los íconos de Material no se usan en la ficha
      const bloques = [];
      for (const href of hrefs) {
        // eslint-disable-next-line no-await-in-loop
        const css = await (await fetch(href)).text();
        for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)) {
          if (m[1] === 'latin') bloques.push(m[2]);
        }
      }
      const archivos = new Map(); // la misma fuente variable se repite para varios grosores
      const conDatos = await Promise.all(
        bloques.map(async (bloque) => {
          const url = /url\(([^)]+)\)/.exec(bloque)?.[1]?.replace(/['"]/g, '');
          if (!url) return '';
          if (!archivos.has(url)) archivos.set(url, fetch(url).then((r) => r.blob()).then(aDataUrl));
          return bloque.replace(url, await archivos.get(url));
        })
      );
      return conDatos.join('\n');
    })().catch((err) => {
      console.warn('No se pudieron incrustar las fuentes en el PDF:', err);
      promesaFuentes = null;
      return '';
    });
  }
  return promesaFuentes;
}

async function esperarImagenes(raiz) {
  await Promise.all(
    [...raiz.querySelectorAll('img')].map((img) =>
      img.complete && img.naturalWidth > 0
        ? null
        : new Promise((r) => {
            img.addEventListener('load', r, { once: true });
            img.addEventListener('error', r, { once: true });
          })
    )
  );
}

/** Saca una "foto" fiel de la hoja con el motor del navegador. */
export async function capturarHoja(hoja, { escala = 2, dosPasadas = true } = {}) {
  await Promise.all([esperarImagenes(hoja), document.fonts?.ready]);
  const fontEmbedCSS = await cssFuentesIncrustadas();
  const opciones = {
    pixelRatio: escala,
    backgroundColor: '#ffffff',
    cacheBust: false,
    fontEmbedCSS,
    width: hoja.offsetWidth,
    height: hoja.offsetHeight,
    style: { margin: '0', boxShadow: 'none' }
  };
  // La primera pasada a veces no termina de pintar las imágenes incrustadas (logos): se hace dos veces.
  // En el ZIP alcanza con hacerlo en la primera ficha; después los logos ya están listos.
  if (dosPasadas) await toCanvas(hoja, opciones);
  return toCanvas(hoja, opciones);
}

/** Arma un PDF A4 de una sola hoja con la imagen centrada y achicada para que entre entera. */
export function pdfDesdeCanvas(canvas, { vertical = false, calidad = 0.88 } = {}) {
  const pdf = new jsPDF({ orientation: vertical ? 'p' : 'l', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = vertical ? 4 : 6;

  const ratio = Math.min((pageWidth - margin * 2) / canvas.width, (pageHeight - margin * 2) / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(canvas.toDataURL('image/jpeg', calidad), 'JPEG', (pageWidth - w) / 2, (pageHeight - h) / 2, w, h, undefined, 'FAST');

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
