# 🏖️ Colonias de Verano — Municipalidad de Valle Viejo

Plataforma Web + PWA (Android & iOS) para la inscripción pública y gestión de **Fichas Médicas Digitales** de las Colonias de Verano de la **Municipalidad de Valle Viejo** (Subsecretaría de Deportes).

---

## ✨ Características Principales

1. **Formulario Público estilo Google Forms (Material Design 3):**
   - Accesible mediante el link `/inscripcion`, sin necesidad de crear cuenta ni descargar ninguna aplicación.
   - **Detector de DNI en tiempo real:** verifica si el niño/a ya fue inscripto antes de enviar.
   - **Cálculo automático** de edad e Índice de Masa Corporal (IMC).
   - Al finalizar, se genera un **link privado y secreto** que permite a la familia volver a ver y descargar su ficha médica.
2. **Planilla Oficial Vertical de Ficha Médica:**
   - Respeta el diseño oficial y todos los campos legales y clínicos de la ficha en papel de **Deportes Valle Viejo**, adaptada en formato **vertical A4** para lectura cómoda en celular, impresión directa y descarga en PDF.
3. **Panel Admin y Coordinadores + Guardia de Urgencias:**
   - Buscador instantáneo por nombre, DNI, padre o número de ficha.
   - Botón directo para **📞 Llamar al Padre/Tutor**, **🚨 Llamar al Contacto de Urgencia**, **💬 Enviar WhatsApp**, **📥 Descargar PDF**, **📤 Compartir Ficha con el Médico** e **🖨️ Imprimir**.
4. **PWA (Progressive Web App) para Android e iOS:**
   - Instalable como App nativa en celulares Android y iPhone, con barra de navegación inferior estilo Material Design 3 y soporte de caché offline.
5. **Difusión de Suspensiones por Mal Clima o Fuerza Mayor:**
   - Publica un banner de alerta en tiempo real en toda la plataforma.
   - Envía **correos electrónicos automáticos** a los padres inscriptos.
   - Genera el listado de envío directo por **WhatsApp (`wa.me`)** sin requerir Meta API.
6. **Banco de Imágenes Privado (Cloudinary):**
   - Acceso exclusivo para personal autorizado logueado (`/admin` → pestaña **Banco de Imágenes**).
   - Subida múltiple directa firmada al navegador (con progreso real, arrastrar y soltar, organización por **Álbum** y **Localidad**, y visor Lightbox).
   - Almacenamiento privado (`type: authenticated`) en la carpeta `colonias-galeria/` con URLs firmadas desde el backend.

---

## 🚀 Cómo probarlo en Local

```bash
# 1. Copiá el archivo de ejemplo de variables de entorno
cp .env.example .env
# (en Windows: copy .env.example .env)

# 2. Levantar Backend (puerto 3001) y Frontend (puerto 5173) al mismo tiempo
npm run dev
```

- **Formulario Público (Padres):** http://localhost:5173/inscripcion
- **Panel Admin / PWA:** http://localhost:5173/admin

En modo `development` (sin `ADMIN_EMAIL`/`ADMIN_PASSWORD`), el sistema crea automáticamente dos usuarios de prueba locales:

| Usuario | Email | Contraseña |
|---|---|---|
| Admin (solo local) | `admin@valleviejo.gob.ar` | `admin123` |
| Coordinador (solo local) | `coordinador@valleviejo.gob.ar` | `coord123` |

> ⚠️ Estos usuarios de prueba **no se crean en producción** (`NODE_ENV=production`). Usá siempre `ADMIN_EMAIL` y `ADMIN_PASSWORD` en Railway.

---

## ☁️ Cómo desplegar en Railway

El proyecto ya incluye `railway.json` configurado:

1. Subí este repositorio a GitHub.
2. En **Railway**, seleccioná **"New Project" → "Deploy from GitHub repo"**.
3. Railway ejecutará automáticamente `npm run install:all && npm run build` y levantará el servidor unificado con `npm start`.
4. ⚠️ **Antes de que el primer deploy arranque**, configurá las siguientes variables de entorno en la pestaña **Variables** de Railway:

```env
NODE_ENV=production

# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=clave_larga_y_aleatoria_de_minimo_32_caracteres

# Usuario administrador inicial (se crea al primer arranque si la tabla está vacía)
ADMIN_EMAIL=tu_correo@valleviejo.gob.ar
ADMIN_PASSWORD=contrasena_segura_minimo_8_caracteres

# Correo SMTP para las alertas a padres
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_clave_de_aplicacion
SMTP_FROM="Colonias de Verano - Municipalidad de Valle Viejo" <deportes@valleviejo.gob.ar>
```

5. **Persistencia de la base de datos:** creá un **Volume** en Railway montado en `/data` y agregá la variable:

```env
DB_PATH=/data/colonias.sqlite
```

> ⚠️ **Sin el Volume + DB_PATH, la base de datos se borra en cada nuevo deploy.** Es obligatorio para no perder inscripciones.

6. Optativo — para habilitar el Banco de Imágenes (Cloudinary):

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

> Si las variables de Cloudinary no están configuradas, la plataforma sigue funcionando normalmente y los endpoints `/api/galeria` responden `503`.
