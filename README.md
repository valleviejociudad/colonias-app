# 🏖️ Colonias de Verano — Municipalidad de Valle Viejo

Plataforma Web + PWA (Android & iOS) para la inscripción pública y gestión de **Fichas Médicas Digitales** de las Colonias de Verano de la **Municipalidad de Valle Viejo** (Subsecretaría de Deportes).

---

## ✨ Características Principales

1. **Formulario Público estilo Google Forms (Material Design 3):**
   - Accesible mediante un único link (`http://localhost:5173/`), sin necesidad de crear cuenta ni descargar ninguna aplicación.
   - **Detector de DNI en tiempo real:** Apenas el padre/tutor ingresa el DNI del niño/a, el sistema verifica si ya fue inscripto y le muestra la sede, número de ficha y acceso directo para ver/descargar su ficha médica.
   - **Cálculo automático** de edad e Índice de Masa Corporal (IMC).
2. **Planilla Oficial Vertical de Ficha Médica:**
   - Respeta el diseño oficial y todos los campos legales y clínicos de la ficha en papel de **Deportes Valle Viejo**, adaptada en formato **vertical A4** para lectura cómoda en celular, impresión directa y descarga en PDF.
3. **Panel Admin y Coordinadores + Guardia de Urgencias:**
   - Buscador instantáneo por nombre, DNI, padre o número de ficha.
   - Botón directo para **📞 Llamar al Padre/Tutor**, **🚨 Llamar al Contacto de Urgencia**, **💬 Enviar WhatsApp**, **📥 Descargar PDF**, **📤 Compartir Ficha con el Médico** e **🖨️ Imprimir**.
4. **PWA (Progressive Web App) para Android e iOS:**
   - Instalable como App nativa en celulares Android y iPhone, con barra de navegación inferior estilo Material Design 3 y soporte de caché offline.
5. **Difusión de Suspensiones por Mal Clima o Fuerza Mayor:**
   - Publica un banner de alerta en tiempo real en toda la plataforma.
   - Envía **correos electrónicos (Email) automáticos** a los padres inscriptos.
   - Genera el listado de envío directo por **WhatsApp (`wa.me`)** sin requerir Meta API.
6. **Banco de Imágenes Privado (Cloudinary):**
   - Acceso exclusivo para personal autorizado logueado (`/admin` → pestaña **Banco de Imágenes**).
   - Subida múltiple directa firmada al navegador (con progreso real, arrastrar y soltar, organización por **Álbum** y **Localidad**, y visor Lightbox).
   - Almacenamiento privado (`type: authenticated`) en la carpeta `colonias-galeria/` con URLs firmadas desde el backend.

---

## 🚀 Cómo probarlo en Local

```bash
# Levantar Backend (puerto 3001) y Frontend (puerto 5173) al mismo tiempo
npm run dev
```

- **Formulario Público (Padres):** [http://localhost:5173/](http://localhost:5173/)
- **Panel Admin / PWA:** [http://localhost:5173/admin](http://localhost:5173/admin)
  - **Usuario Admin:** `admin@valleviejo.gob.ar` / Contraseña: `admin123`
  - **Usuario Coordinador:** `coordinador@valleviejo.gob.ar` / Contraseña: `coord123`
  - **DNI de prueba ya inscripto** (para probar el detector en tiempo real): `54123890` o `56890123`

---

## ☁️ Cómo desplegar en Railway

El proyecto ya incluye `railway.json` configurado:
1. Subí este repositorio a GitHub.
2. En **Railway**, seleccioná **"New Project" -> "Deploy from GitHub repo"**.
3. Railway ejecutará automáticamente `npm run install:all && npm run build` y levantará el servidor unificado con `npm start`.
4. Configurá las variables de entorno en `.env` (local) y en la pestaña **Variables** de Railway para habilitar el **Banco de Imágenes** con Cloudinary:

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

> Nota: Si las variables de Cloudinary no están configuradas, la plataforma sigue funcionando normalmente y los endpoints `/api/galeria` responden `503`.
