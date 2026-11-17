// Generador mínimo de planillas Excel (.xlsx) sin dependencias pesadas: un .xlsx es un ZIP de XML.
// Soporta varias hojas, fila de encabezado en negrita fija, autofiltro y ancho de columnas.
import JSZip from 'jszip';

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function escXml(valor) {
  return String(valor)
    // Caracteres de control que el XML no admite
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function letraColumna(i) {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function celdaXml(valor, ref, estilo) {
  const s = estilo ? ` s="${estilo}"` : '';
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}"${s}><v>${valor}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${escXml(valor)}</t></is></c>`;
}

function hojaXml({ encabezados, filas }) {
  const todas = [encabezados, ...filas];
  const ultimaCol = letraColumna(encabezados.length - 1);

  const anchos = encabezados.map((_, c) => {
    const max = todas.reduce((m, fila) => Math.max(m, String(fila[c] ?? '').length), 0);
    return Math.min(60, Math.max(8, max + 2));
  });

  const cols = anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const rows = todas
    .map((fila, r) => {
      const celdas = fila.map((v, c) => celdaXml(v, `${letraColumna(c)}${r + 1}`, r === 0 ? 1 : 0)).join('');
      return `<row r="${r + 1}">${celdas}</row>`;
    })
    .join('');

  return (
    XML_HEAD +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows}</sheetData>` +
    `<autoFilter ref="A1:${ultimaCol}${Math.max(1, todas.length)}"/>` +
    '</worksheet>'
  );
}

// Nombres de hoja: máx. 31 caracteres, sin []:*?/\ y sin repetir
function nombresDeHoja(nombres) {
  const usados = new Set();
  return nombres.map((n) => {
    const base = String(n || 'Hoja').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Hoja';
    let nombre = base;
    let i = 2;
    while (usados.has(nombre.toLowerCase())) {
      const suf = ` (${i++})`;
      nombre = base.slice(0, 31 - suf.length) + suf;
    }
    usados.add(nombre.toLowerCase());
    return nombre;
  });
}

/** hojas: [{ nombre, encabezados: string[], filas: any[][] }] → Blob .xlsx */
export async function crearXlsx(hojas) {
  // Sin entradas de carpeta en el ZIP: Excel es estricto con el formato
  const zip = new JSZip();
  const file = zip.file.bind(zip);
  zip.file = (nombre, contenido) => file(nombre, contenido, { createFolders: false });
  const nombres = nombresDeHoja(hojas.map((h) => h.nombre));

  zip.file(
    '[Content_Types].xml',
    XML_HEAD +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      hojas
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join('') +
      '</Types>'
  );

  zip.file(
    '_rels/.rels',
    XML_HEAD +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'
  );

  zip.file(
    'xl/workbook.xml',
    XML_HEAD +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      nombres.map((n, i) => `<sheet name="${escXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      '</sheets>' +
      // El autofiltro necesita este nombre definido por hoja para que Excel lo respete
      '<definedNames>' +
      hojas
        .map((h, i) => {
          const ref = `$A$1:$${letraColumna(h.encabezados.length - 1)}$${Math.max(1, h.filas.length + 1)}`;
          return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${escXml(nombres[i].replace(/'/g, "''"))}'!${ref}</definedName>`;
        })
        .join('') +
      '</definedNames></workbook>'
  );

  zip.file(
    'xl/_rels/workbook.xml.rels',
    XML_HEAD +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      hojas
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        )
        .join('') +
      `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      '</Relationships>'
  );

  // Estilo 0: normal. Estilo 1: encabezado en negrita blanca sobre azul pileta.
  zip.file(
    'xl/styles.xml',
    XML_HEAD +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF006494"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>'
  );

  hojas.forEach((h, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, hojaXml(h)));

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE'
  });
}
