// La app se publica bajo /colonias/ (Vite `base`). El Worker de Cloudflare quita el
// prefijo antes de llegar al servidor, así que el backend sigue viendo /api/..., /login, etc.
export const BASE_URL = import.meta.env.BASE_URL;                 // "/colonias/"
export const BASE_PATH = BASE_URL.replace(/\/$/, '');             // "/colonias"
export const API_BASE = `${BASE_PATH}/api`;                       // "/colonias/api"
// Ruta absoluta a un archivo de /public (logos, íconos): asset('logocolonias.png')
export const asset = (name) => `${BASE_URL}${String(name).replace(/^\//, '')}`;
