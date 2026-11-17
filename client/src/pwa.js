// La app instalable (PWA) es solo para uso interno del municipio.
// En las páginas públicas para familias no se ofrece instalarla: sin manifest no hay "Instalar app".
// index.html hace lo mismo al cargar; esto lo mantiene al moverse entre páginas sin recargar.
import { BASE_URL } from './config';

const RUTAS_PUBLICAS = /^\/(inscripcion|ficha)(\/|$)/;
const METAS = [
  ['apple-mobile-web-app-capable', 'yes'],
  ['mobile-web-app-capable', 'yes'],
  ['apple-mobile-web-app-title', 'Colonias VV']
];

export function esRutaPublica(pathname) {
  return RUTAS_PUBLICAS.test(pathname);
}

/** pathname: ruta dentro de la app (sin el /colonias), como la da react-router. */
export function sincronizarPwa(pathname) {
  const head = document.head;
  const actuales = head.querySelectorAll('[data-pwa]');

  if (esRutaPublica(pathname)) {
    actuales.forEach((el) => el.remove());
    return;
  }
  if (actuales.length) return;

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = `${BASE_URL}manifest.json`;
  link.setAttribute('data-pwa', '');
  head.appendChild(link);
  for (const [name, content] of METAS) {
    const meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    meta.setAttribute('data-pwa', '');
    head.appendChild(meta);
  }
}

// Si el navegador igual ofrece instalar estando en una página pública, se cancela el aviso.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    const ruta = window.location.pathname.startsWith(BASE_URL)
      ? `/${window.location.pathname.slice(BASE_URL.length)}`
      : window.location.pathname;
    if (esRutaPublica(ruta)) e.preventDefault();
  });
}
