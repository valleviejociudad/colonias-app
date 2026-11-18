import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import FichaMedicaVerticalView from './FichaMedicaVerticalView';
import { capturarHoja, pdfDesdeCanvas } from '../../utils/pdfFicha';

// Anchos fijos de la hoja para el PDF, sin importar el tamaño de la pantalla:
// horizontal = planilla de PC (A4 apaisado); vertical = planilla de celular (A4 parado).
const ANCHO = { horizontal: 1200, vertical: 800 };

/**
 * Prepara un lugar fuera de la pantalla donde dibujar fichas para el PDF.
 * Devuelve { dibujar(ficha) → hoja, cerrar() }. Se reutiliza para generar muchas seguidas.
 */
export function crearMesaDeTrabajo(layout = 'horizontal') {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-20000px',
    top: '0',
    width: `${ANCHO[layout]}px`,
    background: '#fff',
    pointerEvents: 'none'
  });
  document.body.appendChild(host);
  const root = createRoot(host);

  return {
    dibujar(ficha) {
      flushSync(() => root.render(<FichaMedicaVerticalView ficha={ficha} soloPlanilla layout={layout} />));
      return host.querySelector(layout === 'vertical' ? '.ficha-vertical-sheet' : '.ficha-oficial-sheet');
    },
    cerrar() {
      root.unmount();
      host.remove();
    }
  };
}

/** PDF de una sola hoja A4 para una ficha. */
export async function generarPdfFicha(ficha, { layout = 'horizontal', escala = 2, calidad = 0.88 } = {}) {
  const mesa = crearMesaDeTrabajo(layout);
  try {
    const hoja = mesa.dibujar(ficha);
    const canvas = await capturarHoja(hoja, { escala });
    return pdfDesdeCanvas(canvas, { vertical: layout === 'vertical', calidad });
  } finally {
    mesa.cerrar();
  }
}
