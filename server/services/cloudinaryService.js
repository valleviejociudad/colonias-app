const cloudinary = require('cloudinary').v2;

const GALLERY_FOLDER = 'colonias-galeria';
const PLACEHOLDERS = new Set(['tu_cloud_name', 'tu_api_key', 'tu_api_secret', '']);

function getCredentials() {
  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || '').trim();
  return { cloudName, apiKey, apiSecret };
}

function isConfigured() {
  const { cloudName, apiKey, apiSecret } = getCredentials();
  if (!cloudName || !apiKey || !apiSecret) return false;
  if (PLACEHOLDERS.has(cloudName) || PLACEHOLDERS.has(apiKey) || PLACEHOLDERS.has(apiSecret)) {
    return false;
  }
  return true;
}

function ensureConfigured() {
  if (!isConfigured()) {
    const err = new Error('Galería no configurada');
    err.statusCode = 503;
    throw err;
  }
  const { cloudName, apiKey, apiSecret } = getCredentials();
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
    urlAnalytics: false
  });
  return { cloudName, apiKey, apiSecret };
}

function signUpload({ folder = GALLERY_FOLDER } = {}) {
  const { cloudName, apiKey, apiSecret } = ensureConfigured();

  // Garantizar que toda subida quede dentro de colonias-galeria
  const cleanFolder = String(folder || GALLERY_FOLDER).trim().replace(/^\/+|\/+$/g, '');
  const safeFolder =
    cleanFolder === GALLERY_FOLDER || cleanFolder.startsWith(`${GALLERY_FOLDER}/`)
      ? cleanFolder
      : GALLERY_FOLDER;

  const timestamp = Math.round(Date.now() / 1000);
  const type = 'authenticated';

  const paramsToSign = {
    folder: safeFolder,
    timestamp,
    type
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder: safeFolder,
    type
  };
}

function getSignedUrl(publicId, opts = {}) {
  ensureConfigured();
  return cloudinary.url(publicId, {
    type: 'authenticated',
    resource_type: 'image',
    sign_url: true,
    secure: true,
    analytics: false,
    ...opts
  });
}

function getDownloadUrl(publicId, format = 'jpg') {
  ensureConfigured();
  const safeFormat = String(format || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return cloudinary.utils.private_download_url(publicId, safeFormat, {
    type: 'authenticated',
    resource_type: 'image',
    attachment: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });
}

async function verifyResource(publicId) {
  ensureConfigured();
  return cloudinary.api.resource(publicId, {
    type: 'authenticated',
    resource_type: 'image'
  });
}

async function destroy(publicId) {
  ensureConfigured();
  return cloudinary.uploader.destroy(publicId, {
    type: 'authenticated',
    resource_type: 'image',
    invalidate: true
  });
}

module.exports = {
  GALLERY_FOLDER,
  isConfigured,
  signUpload,
  getSignedUrl,
  getDownloadUrl,
  verifyResource,
  destroy
};
