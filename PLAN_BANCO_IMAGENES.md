# Plan: Banco de imágenes con Cloudinary

> Destinatario: agente implementador. Leé todo antes de empezar. Respetá el estilo del código existente y **no borres comentarios existentes** que no tengan relación con estos cambios.

## 1. Objetivo
La Subsecretaría de Deporte necesita subir, organizar y ver fotos dentro de la app de Colonias (Valle Viejo). Las imágenes se almacenan en **Cloudinary**; los metadatos en la base de datos de la app. La galería es **solo para usuarios logueados** (aparecen menores).

## 2. Contexto del proyecto (ya verificado)
- Monorepo: backend Express en [server/app.js](server/app.js) (~770 líneas, un solo archivo) y cliente React + Vite en `client/`.
- DB: `sql.js` en [server/config/database.js](server/config/database.js). Se persiste como archivo `server/data/colonias.sqlite`. Helpers: `queryAll`, `queryOne`, `runQuery`, `saveDatabase`. Las tablas se crean con `CREATE TABLE IF NOT EXISTS` (~líneas 61-190).
- Auth: JWT. `authMiddleware` en `app.js` (~línea 18). `req.user` contiene `{id, nombre, email, rol}`. Roles existentes: `coordinador` (default), y un admin (verificar valores reales de `rol` en el seed de `database.js` ~línea 192-205).
- Frontend: `client/src/context/AuthContext.jsx` expone `authFetch`. **Ojo:** `authFetch` fuerza `Content-Type: application/json`; para `FormData` hay que NO usar ese header (usar `fetch` directo con `Authorization: Bearer ${token}` o extender `authFetch` para no setearlo cuando `options.body instanceof FormData`).
- Panel admin: `client/src/pages/admin/AdminDashboardPage.jsx` (~1100+ líneas). Pestañas definidas ~línea 254 (`fichas`, `dashboard`, `clima`) y renderizadas con `activeTab === '...'`. Hay navegación mobile (~línea 1119) que reutiliza el mismo array.
- Deploy: Railway (Nixpacks), `railway.json`. Variables en `.env` (ignorado por git); plantilla en `.env.example`.
- Express JSON limit 10 MB: no afecta (la subida va directo a Cloudinary).

## 3. Decisión de arquitectura: subida firmada directa desde el navegador
1. El cliente pide al backend una **firma** (`POST /api/galeria/firma`, protegida con `authMiddleware`).
2. El navegador sube el archivo **directo a Cloudinary** con esa firma (el servidor de Railway no recibe los bytes).
3. Al terminar, el cliente envía a `POST /api/galeria` los datos devueltos (`public_id`, `width`, `height`, `bytes`, `format`) + título/álbum. El backend **verifica** (ver §6) y guarda los metadatos.
4. Para mostrar: el cliente arma URLs de Cloudinary con transformaciones (miniatura/optimizada).

Ventajas: sin `multer`, sin carga en Railway, sin disco efímero, miniaturas y CDN gratis.

### Privacidad
- Subir con `type: "authenticated"` (assets privados). Las URLs de entrega se **firman en el backend** con expiración corta (p. ej. 1 h) y se devuelven solo a usuarios logueados.
- Alternativa más simple si se decide aceptar URLs "no adivinables": `type: "upload"` público con `public_id` aleatorio. **Por defecto implementar `authenticated`.**
- Preset de subida recomendado: carpeta `colonias-galeria/`, formatos permitidos `jpg,png,webp,heic`, tamaño máx. 10 MB, `eager`/transformación entrante que limite a 2000 px de lado (`c_limit,w_2000,h_2000,q_auto`).

## 4. Dependencias y configuración
- Backend: `npm install cloudinary` (en la raíz). No hace falta `multer`.
- Cliente: sin dependencias nuevas (usar `fetch` + `FormData`). Opcional: nada de SDK.
- Variables nuevas (agregar a `.env.example` con valores de ejemplo, **nunca secretos reales**):
  ```
  CLOUDINARY_CLOUD_NAME=tu_cloud_name
  CLOUDINARY_API_KEY=tu_api_key
  CLOUDINARY_API_SECRET=tu_api_secret
  ```
- El usuario debe cargar las tres variables también en Railway (Variables del servicio). Informarlo al final.
- Nuevo servicio: `server/services/cloudinaryService.js` que configure `cloudinary.config(...)` y exporte:
  - `signUpload({ folder })` → `{ timestamp, signature, apiKey, cloudName, folder, type }` usando `cloudinary.utils.api_sign_request`.
  - `getSignedUrl(publicId, opts)` → URL firmada (`cloudinary.url(publicId, { type:'authenticated', sign_url:true, secure:true, ... })`).
  - `destroy(publicId)` → `cloudinary.uploader.destroy(publicId, { type:'authenticated', invalidate:true })`.
  - Si faltan las variables, `isConfigured()` devuelve false y los endpoints responden `503 { error: 'Galería no configurada' }` (la app no debe romperse sin Cloudinary).

## 5. Base de datos (en `database.js`, junto a las demás tablas)
```sql
CREATE TABLE IF NOT EXISTS albumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  colonia_id INTEGER,
  creado_por INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS imagenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  album_id INTEGER,
  colonia_id INTEGER,
  titulo TEXT,
  descripcion TEXT,
  ancho INTEGER,
  alto INTEGER,
  bytes INTEGER,
  formato TEXT,
  subido_por INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
Seguir el patrón de FKs/estilo de las tablas existentes. Llamar a `saveDatabase()` tras escrituras (`runQuery` ya lo hace? **verificar** en `database.js` líneas 10-45).

## 6. Endpoints (en `app.js`, nueva sección `// ==================== GALERÍA ====================`)
Todos con `authMiddleware`. Prefijo `/api/galeria`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/galeria/firma` | Devuelve parámetros firmados para subida directa. |
| POST | `/api/galeria` | Registra una imagen subida: body `{ public_id, titulo, descripcion, album_id, colonia_id, width, height, bytes, format }`. **Validar** que `public_id` empiece con `colonias-galeria/` y que el asset exista consultando `cloudinary.api.resource(public_id, { type:'authenticated' })` (no confiar solo en el cliente). Insertar y devolver el registro. |
| GET | `/api/galeria` | Lista paginada (`?album_id=&colonia_id=&page=&limit=`; default 24). Cada ítem incluye `thumb_url` y `full_url` firmadas (expiran). |
| PUT | `/api/galeria/:id` | Editar título, descripción, álbum. |
| DELETE | `/api/galeria/:id` | Borra el registro y llama a `destroy`. Permitido al admin o a quien la subió (`subido_por`). |
| GET/POST/PUT/DELETE | `/api/galeria/albumes` ... | CRUD simple de álbumes (borrar álbum deja las imágenes con `album_id = NULL`). **Registrar estas rutas ANTES de `/api/galeria/:id`** para evitar conflicto de rutas. |

Reglas:
- Sanitizar y limitar longitudes de textos. Consultas siempre parametrizadas (`?`).
- Rate-limit básico en `/firma` si es simple (opcional).
- Errores en español, formato `{ error: '...' }` como el resto de la API.

## 7. Frontend
1. **Nueva pestaña "Galería"** en `AdminDashboardPage.jsx`: agregar `{ id: 'galeria', label: 'Galería', icon: Images }` (icono de `lucide-react`, ya usado en el archivo) al array de pestañas (~línea 254) y un bloque `{activeTab === 'galeria' && (...)}`. Para no engordar más el archivo, **crear el componente** `client/src/components/galeria/GaleriaPanel.jsx` y usarlo desde la pestaña.
2. `GaleriaPanel` debe incluir:
   - Barra superior: selector de álbum / colonia, botón "Subir fotos", botón "Nuevo álbum".
   - **Subida múltiple** (input file `multiple` + arrastrar y soltar), vista previa, barra de progreso por archivo (usar `XMLHttpRequest` para progreso), validación de tipo/tamaño en cliente, y compresión previa opcional con `canvas` si > 10 MB.
   - Flujo por archivo: pedir firma → POST a `https://api.cloudinary.com/v1_1/{cloud_name}/image/upload` con `file, api_key, timestamp, signature, folder, type=authenticated` → POST `/api/galeria`.
   - Grilla responsive de miniaturas (carga perezosa `loading="lazy"`), paginación o "cargar más".
   - **Visor (lightbox)** con navegación anterior/siguiente, cierre con Esc, título/descripción, botón descargar y borrar (con confirmación).
   - Estados de carga/vacío/error.
3. Respetar el sistema de diseño existente (`client/src/styles/md3.css`, componentes MD3, paleta del municipio, mobile-first: ya existe la vista mobile). Las URLs firmadas expiran: si una imagen falla al cargar, refrescar la lista una vez.
4. Ajustar `authFetch` para no forzar `Content-Type` cuando el body es `FormData` (cambio mínimo y retrocompatible), si se llega a necesitar.

## 8. Permisos
- Cualquier usuario logueado puede ver y subir. Borrar/editar: admin o dueño. Si existe un rol de solo lectura, no permitirle subir. Confirmar los valores de `rol` leyendo `database.js` (seed) antes de codificar.
- **No** exponer la galería en rutas públicas (`/`, `/ficha/:id`).

## 9. Orden de implementación sugerido
1. Dependencia `cloudinary`, `cloudinaryService.js`, variables en `.env.example`.
2. Tablas en `database.js`.
3. Endpoints en `app.js` (probar con curl/Postman, con credenciales de prueba).
4. `GaleriaPanel.jsx` + pestaña en el panel.
5. Ajuste de `authFetch` si hace falta.
6. Documentar en `README.md` (sección Galería + variables de entorno).

## 10. Verificación (obligatoria antes de dar por terminado)
- `npm --prefix client run build` compila sin errores.
- `node server/app.js` arranca sin credenciales de Cloudinary (galería responde 503, el resto sigue andando).
- Con credenciales de prueba: subir 3 fotos (una > 5 MB), verlas en grilla, abrir visor, editar título, borrar y confirmar que desaparece también en Cloudinary.
- Sin token → `401` en todos los endpoints de galería. Un `public_id` de otra carpeta → `400`.
- No loguear ni commitear el `API_SECRET`.

## 11. Fuera de alcance / avisos al usuario
- **Persistencia de la DB en Railway:** `colonias.sqlite` vive en disco efímero y se pierde en cada redeploy. Los metadatos de la galería quedarían huérfanos de las imágenes. **Recomendar al usuario montar un Railway Volume** (p. ej. en `/data`) y hacer que `DB_PATH` sea configurable por variable de entorno (`DB_PATH`). Esto no es parte de este plan salvo que el usuario lo pida, pero **hay que avisárselo** al terminar.
- Plan gratis de Cloudinary: límites de almacenamiento/ancho de banda. Informar al usuario.
- Autorización de uso de imagen de menores: responsabilidad de la Subsecretaría; la app solo restringe el acceso.
- Alertas por WhatsApp: tema distinto, **no** forma parte de este plan.
