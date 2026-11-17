// Exporta las fichas a un CSV que Excel abre directo (separador ";" y BOM UTF-8 para los acentos).

const PATOLOGIAS = [
  ['alergias', 'Alergias'],
  ['cardiacas', 'Cardíacas'],
  ['rinones', 'Riñones'],
  ['oncologicas', 'Oncológicas'],
  ['tiroides', 'Tiroides'],
  ['asmas', 'Asma'],
  ['diabetes', 'Diabetes'],
  ['neurologicas', 'Neurológicas'],
  ['oftalmologicas', 'Oftalmológicas'],
  ['auditivas', 'Auditivas'],
  ['celiaquia', 'Celiaquía'],
  ['discapacidad', 'Discapacidad'],
  ['otras', 'Otras']
];

const siNo = (v) => (Number(v) === 1 ? 'SI' : 'NO');

const COLUMNAS = [
  ['Nº ficha', (f) => f.nro_ficha],
  ['Fecha inscripción', (f) => f.fecha_inscripcion],
  ['Colonia', (f) => f.colonia_nombre],
  ['Sede', (f) => f.colonia_sede],
  ['Turno', (f) => f.colonia_turno],
  ['Niño/a: apellido y nombre', (f) => f.nino_nombre],
  ['Niño/a: DNI', (f) => f.nino_dni],
  ['Fecha de nacimiento', (f) => f.fecha_nacimiento],
  ['Edad', (f) => f.edad],
  ['Domicilio', (f) => f.domicilio],
  ['Teléfono niño/a', (f) => f.telefono_nino],
  ['Obra social', (f) => siNo(f.tiene_obra_social)],
  ['Obra social: cuál', (f) => f.obra_social_nombre],
  ['Esquema de vacunación', (f) => f.esquema_vacunacion],
  ['Tutor: apellido y nombre', (f) => f.padre_nombre],
  ['Parentesco', (f) => f.parentesco],
  ['Tutor: DNI', (f) => f.padre_dni],
  ['Tutor: teléfono', (f) => f.padre_telefono],
  ['Tutor: WhatsApp', (f) => f.padre_whatsapp],
  ['Tutor: email', (f) => f.padre_email],
  ['Contacto de urgencia', (f) => f.contacto_urgencia],
  ['Autoriza control de salud', (f) => siNo(f.autorizado)],
  ['Recibe atención médica', (f) => siNo(f.recibe_atencion_medica)],
  ['Atención médica: detalle', (f) => f.atencion_medica_detalle],
  [
    'Condiciones de salud (resumen)',
    (f) =>
      PATOLOGIAS.filter(([k]) => Number(f[`${k}_si`]) === 1)
        .map(([k, label]) => (f[`${k}_cual`] ? `${label}: ${f[`${k}_cual`]}` : label))
        .join(' | ')
  ],
  ...PATOLOGIAS.flatMap(([k, label]) => [
    [label, (f) => siNo(f[`${k}_si`])],
    [`${label}: cuál`, (f) => f[`${k}_cual`]]
  ]),
  ['Antecedentes personales', (f) => f.antecedentes_personales],
  ['Observaciones', (f) => f.observaciones],
  ['Peso (kg)', (f) => f.peso],
  ['Talla (cm)', (f) => f.talla],
  ['IMC', (f) => f.imc],
  ['Presión arterial', (f) => f.presion_arterial],
  ['Circunferencia de cintura (cm)', (f) => f.circunferencia_cintura],
  ['Firma del profesional', (f) => f.firma_profesional_texto],
  ['Estado', (f) => f.estado]
];

function celda(valor) {
  let s = valor === null || valor === undefined ? '' : String(valor);
  // Evita que Excel interprete el contenido como fórmula (=, @, o +/- que no sean un teléfono)
  if (/^[=@\t\r]/.test(s) || /^[+-](?![\d\s(])/.test(s)) s = `'${s}`;
  // DNI y teléfonos: forzar texto para que Excel no los pase a notación científica ni les quite ceros
  else if (/^\+?\d[\d\s()-]{6,}$/.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s)) return `="${s}"`;
  if (/[;"\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function fichasACsv(fichas) {
  const filas = [COLUMNAS.map(([titulo]) => celda(titulo)).join(';')];
  for (const f of fichas) {
    filas.push(COLUMNAS.map(([, get]) => celda(get(f))).join(';'));
  }
  return '﻿' + filas.join('\r\n');
}

export function descargarArchivo(contenido, nombre, tipo) {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(texto) {
  return (
    String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'todas'
  );
}

export function fechaHoy() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
