import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Planilla horizontal (A4 apaisado, una sola página con ajuste proporcional).
// La usan la descarga individual en PC y el ZIP con todas las fichas.
export async function pdfHorizontalDesdeElemento(element, { escala = 2, calidad = 0.88 } = {}) {
  const canvas = await html2canvas(element, {
    scale: escala,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: 1200,
    logging: false
  });

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
