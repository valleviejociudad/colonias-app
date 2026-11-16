// Celular argentino -> 10 dígitos (código de área + número, sin 0 ni 15). null si no se puede interpretar.
// Misma regla que el servidor (server/app.js, normalizarCelular).
export function normalizarCelular(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2);
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) {
    for (const i of [2, 3, 4]) {
      if (d.substr(i, 2) === '15') {
        d = d.slice(0, i) + d.slice(i + 2);
        break;
      }
    }
  }
  return /^[1-9]\d{9}$/.test(d) ? d : null;
}

export const MSG_CELULAR = 'Revisá el celular: escribilo con código de área, sin 0 ni 15. Ejemplo: 3834512345';
