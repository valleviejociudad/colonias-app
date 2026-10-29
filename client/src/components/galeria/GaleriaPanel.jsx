import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Images,
  Upload,
  FolderPlus,
  Folder,
  MapPin,
  Trash2,
  Edit3,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name = '') {
  const parts = String(name).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function defaultTitleFromFilename(name = '') {
  return String(name)
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 120);
}

/**
 * Comprime y limita a 2000px de lado con <canvas> cuando el archivo supera 10 MB
 */
function compressImageIfNeeded(file, maxDimension = 2000, quality = 0.84) {
  if (file.size <= MAX_BYTES) {
    return Promise.resolve(file);
  }

  return new Promise((resolve, reject) => {
    const ext = getFileExtension(file.name);
    if (ext === 'heic') {
      reject(new Error('El archivo HEIC supera los 10 MB permitidos. Convertilo a JPG o reducí su tamaño.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo comprimir la imagen en este navegador.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Error al comprimir la imagen mayor a 10 MB.'));
            return;
          }
          if (blob.size > MAX_BYTES) {
            reject(new Error('Incluso comprimida, la imagen supera el límite máximo de 10 MB.'));
            return;
          }
          const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
          const compressedFile = new File([blob], cleanName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen para comprimirla (> 10 MB).'));
    };

    img.src = objectUrl;
  });
}

/**
 * Subida directa a Cloudinary mediante XMLHttpRequest para reportar progreso real
 */
function uploadToCloudinaryXHR(file, signData, onProgress) {
  return new Promise((resolve, reject) => {
    const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(signData.cloudName)}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signData.apiKey);
    formData.append('timestamp', String(signData.timestamp));
    formData.append('signature', signData.signature);
    formData.append('folder', signData.folder);
    formData.append('type', signData.type);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && typeof onProgress === 'function') {
        const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      let json = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.public_id) {
        resolve(json);
      } else {
        const msg = json?.error?.message || 'Error al subir archivo a Cloudinary';
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Error de red al conectar con Cloudinary'));
    xhr.send(formData);
  });
}

export default function GaleriaPanel({ colonias = [], isMobileView = false }) {
  const { user, authFetch } = useAuth();

  // Filtros y datos principales
  const [albumes, setAlbumes] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState('todos'); // 'todos' | 'sin_album' | id
  const [selectedColonia, setSelectedColonia] = useState('todas');

  const [imagenes, setImagenes] = useState([]);
  const [totalImagenes, setTotalImagenes] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Subida múltiple
  const [showUploader, setShowUploader] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadAlbumId, setUploadAlbumId] = useState('');
  const [uploadColoniaId, setUploadColoniaId] = useState('');
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const fileInputRef = useRef(null);

  // Modal Álbum (crear / editar)
  const [albumModal, setAlbumModal] = useState(null); // null | { mode: 'create'|'edit', id?, nombre, descripcion, colonia_id }
  const [savingAlbum, setSavingAlbum] = useState(false);

  // Visor Lightbox + Edición de imagen
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null); // null | { id, titulo, descripcion, album_id, colonia_id }
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  // Control de refresco único ante expiración de URLs firmadas
  const lastExpiredRefreshRef = useRef(0);

  const isReadOnly = ['lectura', 'readonly', 'solo_lectura'].includes(
    String(user?.rol || '').toLowerCase()
  );

  const canManageItem = useCallback(
    (ownerId) => {
      if (!user) return false;
      if (user.rol === 'admin') return true;
      return ownerId !== null && ownerId !== undefined && Number(ownerId) === Number(user.id);
    },
    [user]
  );

  const cargarAlbumes = useCallback(async () => {
    try {
      const res = await authFetch('/api/galeria/albumes');
      if (res.status === 503) {
        setNotConfigured(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAlbumes(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silencioso; cargarGaleria maneja el estado principal de error
    }
  }, [authFetch]);

  const cargarGaleria = useCallback(
    async ({ targetPage = 1, append = false, silent = false } = {}) => {
      if (!silent) {
        if (append) setLoadingMore(true);
        else setLoading(true);
      }
      setErrorMsg('');

      try {
        const params = new URLSearchParams();
        params.set('page', String(targetPage));
        params.set('limit', '24');
        if (selectedAlbum !== 'todos') {
          params.set('album_id', String(selectedAlbum));
        }
        if (selectedColonia !== 'todas') {
          params.set('colonia_id', String(selectedColonia));
        }

        const res = await authFetch(`/api/galeria?${params.toString()}`);
        if (res.status === 503) {
          const errData = await res.json().catch(() => ({}));
          setNotConfigured(true);
          setErrorMsg(errData.error || 'Galería no configurada');
          setImagenes([]);
          setTotalImagenes(0);
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'No se pudo cargar el banco de imágenes');
        }

        setNotConfigured(false);
        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];

        setImagenes((prev) => (append ? [...prev, ...items] : items));
        setTotalImagenes(data.total || 0);
        setPage(data.page || targetPage);
        setHasMore(Boolean(data.hasMore));
      } catch (err) {
        setErrorMsg(err.message || 'Error al cargar las imágenes');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [authFetch, selectedAlbum, selectedColonia]
  );

  useEffect(() => {
    cargarAlbumes();
  }, [cargarAlbumes]);

  useEffect(() => {
    setLightboxIndex(null);
    cargarGaleria({ targetPage: 1, append: false });
  }, [cargarGaleria]);

  // Limpiar ObjectURLs al desmontar
  useEffect(() => {
    return () => {
      uploadQueue.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navegación por teclado en el Lightbox (Esc, Izquierda, Derecha)
  useEffect(() => {
    if (lightboxIndex === null) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editingPhoto) {
          setEditingPhoto(null);
        } else {
          setLightboxIndex(null);
          setConfirmDeleteId(null);
        }
      } else if (e.key === 'ArrowLeft' && !editingPhoto) {
        setConfirmDeleteId(null);
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight' && !editingPhoto) {
        setConfirmDeleteId(null);
        setLightboxIndex((prev) =>
          prev !== null && prev < imagenes.length - 1 ? prev + 1 : prev
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, imagenes.length, editingPhoto]);

  // Si una URL firmada expiró, refrescar la lista automáticamente una vez
  const handleImageLoadError = () => {
    const now = Date.now();
    if (now - lastExpiredRefreshRef.current > 60000) {
      lastExpiredRefreshRef.current = now;
      cargarGaleria({ targetPage: 1, append: false, silent: true });
    }
  };

  // ==================== MANEJO DE COLA DE SUBIDA ====================
  const addFilesToQueue = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const newEntries = files.map((file) => {
      const ext = getFileExtension(file.name);
      const validType = ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIMES.includes(file.type);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      return {
        id,
        file,
        titulo: defaultTitleFromFilename(file.name),
        previewUrl: validType && ext !== 'heic' ? URL.createObjectURL(file) : null,
        progress: 0,
        status: validType ? 'pending' : 'error', // 'pending' | 'uploading' | 'done' | 'error'
        error: validType
          ? ''
          : 'Formato no permitido. Usá JPG, PNG, WEBP o HEIC.',
        needsCompression: file.size > MAX_BYTES
      };
    });

    setUploadQueue((prev) => [...prev, ...newEntries]);
    if (!showUploader) setShowUploader(true);

    // Preseleccionar álbum/localidad si hay filtros activos
    if (!uploadAlbumId && selectedAlbum !== 'todos' && selectedAlbum !== 'sin_album') {
      setUploadAlbumId(String(selectedAlbum));
    }
    if (!uploadColoniaId && selectedColonia !== 'todas') {
      setUploadColoniaId(String(selectedColonia));
    }
  };

  const removeFromQueue = (id) => {
    setUploadQueue((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const updateQueueItem = (id, patch) => {
    setUploadQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleStartUpload = async () => {
    const pendingItems = uploadQueue.filter((i) => i.status === 'pending');
    if (pendingItems.length === 0 || isUploadingBatch) return;

    setIsUploadingBatch(true);
    let uploadedAny = false;

    for (const item of pendingItems) {
      try {
        updateQueueItem(item.id, { status: 'uploading', progress: 2, error: '' });

        // 1. Comprimir si supera 10 MB
        const readyFile = await compressImageIfNeeded(item.file);

        // 2. Solicitar firma al backend
        const signRes = await authFetch('/api/galeria/firma', { method: 'POST' });
        const signData = await signRes.json().catch(() => ({}));
        if (!signRes.ok) {
          throw new Error(signData.error || 'No se pudo obtener autorización de subida');
        }

        // 3. Subida directa firmada a Cloudinary con progreso real (XHR)
        const cloudRes = await uploadToCloudinaryXHR(readyFile, signData, (pct) => {
          updateQueueItem(item.id, { progress: pct });
        });

        // 4. Registrar metadatos verificados en nuestro backend
        const saveRes = await authFetch('/api/galeria', {
          method: 'POST',
          body: JSON.stringify({
            public_id: cloudRes.public_id,
            width: cloudRes.width,
            height: cloudRes.height,
            bytes: cloudRes.bytes,
            format: cloudRes.format,
            titulo: item.titulo.trim() || null,
            album_id: uploadAlbumId || null,
            colonia_id: uploadColoniaId || null
          })
        });

        const savedPhoto = await saveRes.json().catch(() => ({}));
        if (!saveRes.ok) {
          throw new Error(savedPhoto.error || 'Error al registrar la foto en la base de datos');
        }

        updateQueueItem(item.id, { status: 'done', progress: 100 });
        uploadedAny = true;
      } catch (err) {
        updateQueueItem(item.id, {
          status: 'error',
          error: err.message || 'Falló la subida'
        });
      }
    }

    setIsUploadingBatch(false);
    if (uploadedAny) {
      await cargarAlbumes();
      await cargarGaleria({ targetPage: 1, append: false, silent: true });
    }
  };

  const clearCompletedUploads = () => {
    setUploadQueue((prev) => {
      prev.forEach((i) => {
        if (i.status === 'done' && i.previewUrl) URL.revokeObjectURL(i.previewUrl);
      });
      return prev.filter((i) => i.status !== 'done');
    });
  };

  // ==================== CRUD DE ÁLBUMES ====================
  const handleSaveAlbum = async (e) => {
    e.preventDefault();
    if (!albumModal?.nombre?.trim() || savingAlbum) return;

    setSavingAlbum(true);
    try {
      const isEdit = albumModal.mode === 'edit';
      const url = isEdit ? `/api/galeria/albumes/${albumModal.id}` : '/api/galeria/albumes';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          nombre: albumModal.nombre.trim(),
          descripcion: albumModal.descripcion?.trim() || '',
          colonia_id: albumModal.colonia_id || null
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el álbum');

      await cargarAlbumes();
      if (!isEdit && data?.id) {
        setSelectedAlbum(String(data.id));
      } else {
        await cargarGaleria({ targetPage: 1, append: false, silent: true });
      }
      setAlbumModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleDeleteAlbum = async (album) => {
    if (!window.confirm(`¿Eliminar el álbum "${album.nombre}"?\nLas fotos no se borrarán (quedarán sin álbum asignado).`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/galeria/albumes/${album.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el álbum');

      setSelectedAlbum('todos');
      await cargarAlbumes();
    } catch (err) {
      alert(err.message);
    }
  };

  // ==================== EDICIÓN Y BORRADO DE FOTOS ====================
  const handleSavePhotoEdit = async (e) => {
    e.preventDefault();
    if (!editingPhoto || savingPhoto) return;

    setSavingPhoto(true);
    try {
      const res = await authFetch(`/api/galeria/${editingPhoto.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: editingPhoto.titulo,
          descripcion: editingPhoto.descripcion,
          album_id: editingPhoto.album_id || null,
          colonia_id: editingPhoto.colonia_id || null
        })
      });

      const updated = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(updated.error || 'No se pudo actualizar la foto');

      setImagenes((prev) => prev.map((img) => (img.id === updated.id ? updated : img)));
      setEditingPhoto(null);
      cargarAlbumes();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (deletingPhoto) return;
    setDeletingPhoto(true);
    try {
      const res = await authFetch(`/api/galeria/${photo.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo borrar la imagen');

      setImagenes((prev) => {
        const next = prev.filter((i) => i.id !== photo.id);
        if (next.length === 0) {
          setLightboxIndex(null);
        } else if (lightboxIndex !== null && lightboxIndex >= next.length) {
          setLightboxIndex(next.length - 1);
        }
        return next;
      });
      setTotalImagenes((t) => Math.max(0, t - 1));
      setConfirmDeleteId(null);
      cargarAlbumes();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingPhoto(false);
    }
  };

  const currentAlbumObj = albumes.find((a) => String(a.id) === String(selectedAlbum));
  const activePhoto = lightboxIndex !== null ? imagenes[lightboxIndex] : null;
  const pendingCount = uploadQueue.filter((i) => i.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '14px' : '18px' }}>
      {/* ==================== CABECERA BANCO DE IMÁGENES ==================== */}
      <div
        className="hero-banner"
        style={{
          marginBottom: 0,
          padding: isMobileView ? '16px' : '22px 24px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobileView ? 'flex-start' : 'center',
            flexDirection: isMobileView ? 'column' : 'row',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2
                className="font-display"
                style={{
                  fontSize: isMobileView ? '1.22rem' : '1.5rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.2
                }}
              >
                Banco de Imágenes
              </h2>
              <span
                style={{
                  padding: '3px 10px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {totalImagenes} {totalImagenes === 1 ? 'foto' : 'fotos'}
              </span>
            </div>
            <p
              style={{
                fontSize: isMobileView ? '0.79rem' : '0.86rem',
                color: 'rgba(255,255,255,0.88)',
                marginTop: '4px'
              }}
            >
              Repositorio fotográfico privado de las Colonias de Verano (acceso exclusivo personal autorizado)
            </p>
          </div>

          {!notConfigured && !isReadOnly && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                width: isMobileView ? '100%' : 'auto'
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setAlbumModal({
                    mode: 'create',
                    nombre: '',
                    descripcion: '',
                    colonia_id: selectedColonia !== 'todas' ? selectedColonia : ''
                  })
                }
                className="md3-btn"
                style={{
                  flex: isMobileView ? 1 : 'initial',
                  background: 'rgba(255,255,255,0.16)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.45)',
                  padding: isMobileView ? '9px 12px' : '10px 16px',
                  fontSize: '0.83rem'
                }}
              >
                <FolderPlus size={16} />
                <span>Nuevo álbum</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUploader(true);
                  setTimeout(() => fileInputRef.current?.click(), 60);
                }}
                className="md3-btn"
                style={{
                  flex: isMobileView ? 1 : 'initial',
                  background: '#ffffff',
                  color: 'var(--md-sys-color-primary)',
                  fontWeight: 800,
                  padding: isMobileView ? '9px 12px' : '10px 18px',
                  fontSize: '0.83rem'
                }}
              >
                <Upload size={16} />
                <span>Subir fotos</span>
              </button>
            </div>
          )}
        </div>

        {/* Filtros de Álbum y Localidad */}
        {!notConfigured && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr',
              gap: '10px',
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'rgba(255,255,255,0.86)',
                  marginBottom: '4px'
                }}
              >
                Álbum fotográfico
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={selectedAlbum}
                  onChange={(e) => setSelectedAlbum(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '40px',
                    borderRadius: '12px',
                    border: 'none',
                    padding: '0 12px',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    background: '#ffffff'
                  }}
                >
                  <option value="todos">📁 Todos los álbumes</option>
                  <option value="sin_album">🖼️ Fotos sin álbum</option>
                  {albumes.map((alb) => (
                    <option key={alb.id} value={String(alb.id)}>
                      📂 {alb.nombre} ({alb.total_imagenes || 0})
                    </option>
                  ))}
                </select>

                {currentAlbumObj && canManageItem(currentAlbumObj.creado_por) && (
                  <>
                    <button
                      type="button"
                      title="Editar álbum"
                      onClick={() =>
                        setAlbumModal({
                          mode: 'edit',
                          id: currentAlbumObj.id,
                          nombre: currentAlbumObj.nombre,
                          descripcion: currentAlbumObj.descripcion || '',
                          colonia_id: currentAlbumObj.colonia_id || ''
                        })
                      }
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.4)',
                        background: 'rgba(255,255,255,0.18)',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      title="Eliminar álbum"
                      onClick={() => handleDeleteAlbum(currentAlbumObj)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.4)',
                        background: 'rgba(186,26,26,0.75)',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'rgba(255,255,255,0.86)',
                  marginBottom: '4px'
                }}
              >
                Filtrar por localidad
              </label>
              <select
                value={selectedColonia}
                onChange={(e) => setSelectedColonia(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '12px',
                  border: 'none',
                  padding: '0 12px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: '#ffffff'
                }}
              >
                <option value="todas">📍 Todas las Localidades</option>
                {colonias.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nombre} — {c.sede}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Input oculto para selección múltiple */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,.heic"
        style={{ display: 'none' }}
        onChange={(e) => {
          addFilesToQueue(e.target.files);
          e.target.value = '';
        }}
      />

      {/* ==================== ESTADO 503: CLOUDINARY NO CONFIGURADO ==================== */}
      {notConfigured && (
        <div className="gf-card" style={{ borderLeft: '5px solid #d97706', padding: isMobileView ? '18px 16px' : '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertCircle size={24} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 className="font-display" style={{ fontSize: '1.12rem', fontWeight: 800, color: '#0f172a' }}>
                Banco de Imágenes pendiente de configuración (Cloudinary)
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                El servidor respondió <strong>"{errorMsg || 'Galería no configurada'}"</strong>. Para habilitar el almacenamiento privado de fotografías, configurá las siguientes variables en el archivo <code>.env</code> local o en el panel de variables de <strong>Railway</strong>:
              </p>
              <pre
                style={{
                  marginTop: '12px',
                  padding: '12px 14px',
                  background: '#0f172a',
                  color: '#e2e8f0',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  overflowX: 'auto'
                }}
              >
{`CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret`}
              </pre>
              <button
                type="button"
                onClick={() => {
                  cargarAlbumes();
                  cargarGaleria({ targetPage: 1 });
                }}
                className="md3-btn md3-btn-tonal"
                style={{ marginTop: '14px' }}
              >
                <RefreshCw size={15} /> Reintentar conexión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== PANEL DE SUBIDA MÚLTIPLE + DRAG & DROP ==================== */}
      <AnimatePresence>
        {showUploader && !notConfigured && !isReadOnly && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="gf-card"
            style={{ padding: isMobileView ? '16px 14px' : '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="font-display" style={{ fontSize: '1.08rem', fontWeight: 800 }}>
                Subir fotografías al Banco de Imágenes
              </h3>
              <button
                type="button"
                onClick={() => !isUploadingBatch && setShowUploader(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '999px',
                  width: '32px',
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isUploadingBatch ? 'not-allowed' : 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Destino de las fotos (álbum + localidad) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr',
                gap: '10px',
                marginBottom: '12px'
              }}
            >
              <div className="md3-field" style={{ marginBottom: 0 }}>
                <label className="md3-label">Asignar a Álbum (opcional)</label>
                <select
                  className="md3-select"
                  value={uploadAlbumId}
                  onChange={(e) => setUploadAlbumId(e.target.value)}
                  disabled={isUploadingBatch}
                >
                  <option value="">Sin álbum específico</option>
                  {albumes.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md3-field" style={{ marginBottom: 0 }}>
                <label className="md3-label">Localidad / Colonia (opcional)</label>
                <select
                  className="md3-select"
                  value={uploadColoniaId}
                  onChange={(e) => setUploadColoniaId(e.target.value)}
                  disabled={isUploadingBatch}
                >
                  <option value="">General (todas las localidades)</option>
                  {colonias.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nombre} — {c.sede}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Zona Arrastrar y Soltar */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!isUploadingBatch) addFilesToQueue(e.dataTransfer.files);
              }}
              onClick={() => !isUploadingBatch && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--md-sys-color-primary)' : '#94a3b8'}`,
                background: isDragging ? '#e0f2fe' : '#f8fafc',
                borderRadius: '16px',
                padding: isMobileView ? '20px 14px' : '26px 20px',
                textAlign: 'center',
                cursor: isUploadingBatch ? 'default' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Upload size={28} style={{ color: 'var(--md-sys-color-primary)', margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                Tocá para elegir fotos o arrastralas hasta aquí
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                Formatos JPG, PNG, WEBP o HEIC • Selección múltiple • Compresión automática si supera 10 MB
              </div>
            </div>

            {/* Lista de archivos en cola con progreso individual */}
            {uploadQueue.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.titulo}
                        style={{ width: '46px', height: '46px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '8px',
                          background: '#e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          color: '#475569',
                          flexShrink: 0
                        }}
                      >
                        IMG
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        value={item.titulo}
                        disabled={item.status !== 'pending' || isUploadingBatch}
                        onChange={(e) => updateQueueItem(item.id, { titulo: e.target.value })}
                        placeholder="Título de la foto..."
                        style={{
                          width: '100%',
                          border: 'none',
                          borderBottom: item.status === 'pending' ? '1px dashed #cbd5e1' : 'none',
                          fontSize: '0.84rem',
                          fontWeight: 600,
                          color: '#0f172a',
                          background: 'transparent',
                          outline: 'none',
                          paddingBottom: '2px'
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.73rem', color: '#64748b', marginTop: '3px' }}>
                        <span>{formatBytes(item.file.size)}</span>
                        {item.needsCompression && item.status === 'pending' && (
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>• Se optimizará a &lt;10 MB</span>
                        )}
                        {item.status === 'uploading' && (
                          <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 700 }}>
                            Subiendo {item.progress}%...
                          </span>
                        )}
                        {item.status === 'done' && (
                          <span style={{ color: '#006c4c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={13} /> Subida
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span style={{ color: '#ba1a1a', fontWeight: 700 }}>{item.error}</span>
                        )}
                      </div>

                      {(item.status === 'uploading' || item.status === 'done') && (
                        <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '999px', marginTop: '5px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${item.progress}%`,
                              background: item.status === 'done' ? '#006c4c' : 'var(--md-sys-color-primary)',
                              transition: 'width 0.2s ease'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {!isUploadingBatch && item.status !== 'done' && (
                      <button
                        type="button"
                        onClick={() => removeFromQueue(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Quitar de la lista"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {uploadQueue.some((i) => i.status === 'done') && !isUploadingBatch && (
                    <button type="button" onClick={clearCompletedUploads} className="md3-btn md3-btn-outlined" style={{ fontSize: '0.8rem' }}>
                      Limpiar completadas
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pendingCount === 0 || isUploadingBatch}
                    onClick={handleStartUpload}
                    className="md3-btn md3-btn-filled"
                    style={{ opacity: pendingCount === 0 || isUploadingBatch ? 0.65 : 1 }}
                  >
                    <Upload size={16} />
                    <span>
                      {isUploadingBatch
                        ? 'Subiendo imágenes...'
                        : `Iniciar subida (${pendingCount})`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Descripcion del álbum activo si aplica */}
      {currentAlbumObj && (
        <div
          className="gf-card"
          style={{
            padding: '12px 16px',
            background: '#f0f9ff',
            borderColor: '#bae6fd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0c4a6e', fontSize: '0.95rem' }}>
              <Folder size={16} /> {currentAlbumObj.nombre}
            </div>
            {currentAlbumObj.descripcion && (
              <p style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>{currentAlbumObj.descripcion}</p>
            )}
          </div>
          {currentAlbumObj.colonia_nombre && (
            <span className="ficha-badge">📍 {currentAlbumObj.colonia_nombre}</span>
          )}
        </div>
      )}

      {/* ==================== CONTENIDO PRINCIPAL: ESTADOS CARGA / ERROR / VACÍO / GRILLA ==================== */}
      {!notConfigured && (
        <>
          {errorMsg && (
            <div className="gf-card" style={{ borderLeft: '4px solid #ba1a1a', padding: '14px 16px', color: '#991b1b', fontSize: '0.88rem' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '44px 20px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
              Cargando fotografías del banco de imágenes...
            </div>
          ) : imagenes.length === 0 ? (
            <div className="gf-card" style={{ textAlign: 'center', padding: isMobileView ? '36px 18px' : '48px 24px' }}>
              <Images size={42} style={{ color: '#94a3b8', margin: '0 auto 10px' }} />
              <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                Todavía no hay fotos en esta vista
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px', maxWidth: '420px', marginInline: 'auto' }}>
                Subí imágenes de las actividades deportivas, recreativas y jornadas de las colonias para organizarlas por álbum y localidad.
              </p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUploader(true);
                    setTimeout(() => fileInputRef.current?.click(), 60);
                  }}
                  className="md3-btn md3-btn-filled"
                  style={{ marginTop: '16px' }}
                >
                  <Plus size={17} /> Subir primeras fotos
                </button>
              )}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobileView
                    ? 'repeat(2, minmax(0, 1fr))'
                    : 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: isMobileView ? '10px' : '14px'
                }}
              >
                {imagenes.map((img, idx) => (
                  <motion.div
                    key={img.id}
                    whileHover={{ y: -2 }}
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setEditingPhoto(null);
                      setLightboxIndex(idx);
                    }}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1px solid var(--md-sys-color-outline-variant)',
                      boxShadow: '0 1px 4px rgba(0,30,48,0.07)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1 / 1',
                        background: '#e2e8f0',
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={img.thumb_url}
                        alt={img.titulo || 'Fotografía de colonia'}
                        loading="lazy"
                        onError={handleImageLoadError}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                      {img.album_nombre && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(15, 23, 42, 0.72)',
                            backdropFilter: 'blur(4px)',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            maxWidth: '85%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          📂 {img.album_nombre}
                        </span>
                      )}
                    </div>

                    <div style={{ padding: isMobileView ? '8px 10px' : '10px 12px' }}>
                      <div
                        style={{
                          fontSize: isMobileView ? '0.8rem' : '0.86rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {img.titulo || 'Sin título'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#64748b',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {img.colonia_nombre ? `📍 ${img.colonia_nombre}` : '📍 General'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Paginación / Cargar más */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '8px'
                }}
              >
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Mostrando {imagenes.length} de {totalImagenes} fotografías
                </span>
                {hasMore && (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => cargarGaleria({ targetPage: page + 1, append: true })}
                    className="md3-btn md3-btn-tonal"
                  >
                    {loadingMore ? 'Cargando más...' : 'Cargar más fotos'}
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ==================== MODAL CREAR / EDITAR ÁLBUM ==================== */}
      {albumModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.58)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 110
          }}
          onClick={() => !savingAlbum && setAlbumModal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gf-card"
            style={{ width: '100%', maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '12px' }}>
              {albumModal.mode === 'edit' ? 'Editar Álbum' : 'Crear Nuevo Álbum'}
            </h3>
            <form onSubmit={handleSaveAlbum}>
              <div className="md3-field">
                <label className="md3-label">Nombre del álbum *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  className="md3-input"
                  placeholder="Ej: Apertura Temporada 2026 - Pileta"
                  value={albumModal.nombre}
                  onChange={(e) => setAlbumModal({ ...albumModal, nombre: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">Localidad vinculada (opcional)</label>
                <select
                  className="md3-select"
                  value={albumModal.colonia_id}
                  onChange={(e) => setAlbumModal({ ...albumModal, colonia_id: e.target.value })}
                >
                  <option value="">Todas las Localidades</option>
                  {colonias.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nombre} — {c.sede}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md3-field">
                <label className="md3-label">Descripción (opcional)</label>
                <textarea
                  rows="3"
                  maxLength={500}
                  className="md3-textarea"
                  placeholder="Breve detalle de la jornada o actividad..."
                  value={albumModal.descripcion}
                  onChange={(e) => setAlbumModal({ ...albumModal, descripcion: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="md3-btn md3-btn-outlined"
                  onClick={() => setAlbumModal(null)}
                  disabled={savingAlbum}
                >
                  Cancelar
                </button>
                <button type="submit" className="md3-btn md3-btn-filled" disabled={savingAlbum}>
                  {savingAlbum ? 'Guardando...' : 'Guardar álbum'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ==================== VISOR LIGHTBOX PANTALLA COMPLETA ==================== */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 6, 23, 0.92)',
              zIndex: 120,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: isMobileView ? '12px' : '20px'
            }}
            onClick={() => {
              if (!editingPhoto) {
                setLightboxIndex(null);
                setConfirmDeleteId(null);
              }
            }}
          >
            {/* Barra superior del visor */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                color: '#ffffff'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#cbd5e1' }}>
                Foto {lightboxIndex + 1} de {imagenes.length}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={activePhoto.download_url || activePhoto.full_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="md3-btn"
                  style={{
                    background: 'rgba(255,255,255,0.14)',
                    color: '#ffffff',
                    padding: '7px 12px',
                    fontSize: '0.78rem',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={15} />
                  {!isMobileView && <span>Descargar</span>}
                </a>

                {canManageItem(activePhoto.subido_por) && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPhoto({
                          id: activePhoto.id,
                          titulo: activePhoto.titulo || '',
                          descripcion: activePhoto.descripcion || '',
                          album_id: activePhoto.album_id ? String(activePhoto.album_id) : '',
                          colonia_id: activePhoto.colonia_id ? String(activePhoto.colonia_id) : ''
                        })
                      }
                      className="md3-btn"
                      style={{
                        background: 'rgba(255,255,255,0.14)',
                        color: '#ffffff',
                        padding: '7px 12px',
                        fontSize: '0.78rem'
                      }}
                    >
                      <Edit3 size={15} />
                      {!isMobileView && <span>Editar</span>}
                    </button>

                    {confirmDeleteId === activePhoto.id ? (
                      <button
                        type="button"
                        disabled={deletingPhoto}
                        onClick={() => handleDeletePhoto(activePhoto)}
                        className="md3-btn"
                        style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          padding: '7px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 800
                        }}
                      >
                        {deletingPhoto ? 'Borrando...' : '¿Confirmar borrado?'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(activePhoto.id)}
                        className="md3-btn"
                        style={{
                          background: 'rgba(220, 38, 38, 0.28)',
                          color: '#fecaca',
                          padding: '7px 12px',
                          fontSize: '0.78rem'
                        }}
                      >
                        <Trash2 size={15} />
                        {!isMobileView && <span>Eliminar</span>}
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex(null);
                    setEditingPhoto(null);
                    setConfirmDeleteId(null);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '999px',
                    background: 'rgba(255,255,255,0.18)',
                    border: 'none',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="Cerrar (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Imagen central + flechas Anterior / Siguiente */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '10px 0'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {lightboxIndex > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setEditingPhoto(null);
                    setLightboxIndex((i) => i - 1);
                  }}
                  style={{
                    position: 'absolute',
                    left: isMobileView ? '4px' : '12px',
                    width: '42px',
                    height: '42px',
                    borderRadius: '999px',
                    background: 'rgba(15, 23, 42, 0.72)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  title="Anterior"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              <img
                src={activePhoto.full_url}
                alt={activePhoto.titulo || 'Fotografía'}
                onError={handleImageLoadError}
                style={{
                  maxWidth: '100%',
                  maxHeight: isMobileView ? '64vh' : '74vh',
                  objectFit: 'contain',
                  borderRadius: '10px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
                }}
              />

              {lightboxIndex < imagenes.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setEditingPhoto(null);
                    setLightboxIndex((i) => i + 1);
                  }}
                  style={{
                    position: 'absolute',
                    right: isMobileView ? '4px' : '12px',
                    width: '42px',
                    height: '42px',
                    borderRadius: '999px',
                    background: 'rgba(15, 23, 42, 0.72)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  title="Siguiente"
                >
                  <ChevronRight size={22} />
                </button>
              )}
            </div>

            {/* Pie del visor o formulario de edición rápida */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                borderRadius: '14px',
                padding: isMobileView ? '12px' : '14px 18px',
                color: '#ffffff',
                maxWidth: '820px',
                width: '100%',
                margin: '0 auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {editingPhoto ? (
                <form onSubmit={handleSavePhotoEdit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      maxLength={150}
                      placeholder="Título de la foto"
                      value={editingPhoto.titulo}
                      onChange={(e) => setEditingPhoto({ ...editingPhoto, titulo: e.target.value })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #475569',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.84rem'
                      }}
                    />
                    <select
                      value={editingPhoto.album_id}
                      onChange={(e) => setEditingPhoto({ ...editingPhoto, album_id: e.target.value })}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #475569',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.84rem'
                      }}
                    >
                      <option value="">Sin álbum</option>
                      {albumes.map((a) => (
                        <option key={a.id} value={String(a.id)}>
                          📂 {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    maxLength={600}
                    placeholder="Descripción o nota..."
                    value={editingPhoto.descripcion}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, descripcion: e.target.value })}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #475569',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontSize: '0.84rem'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingPhoto(null)}
                      className="md3-btn"
                      style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingPhoto}
                      className="md3-btn md3-btn-filled"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      {savingPhoto ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div style={{ fontWeight: 800, fontSize: isMobileView ? '0.94rem' : '1.02rem' }}>
                    {activePhoto.titulo || 'Fotografía sin título'}
                  </div>
                  {activePhoto.descripcion && (
                    <p style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '3px' }}>
                      {activePhoto.descripcion}
                    </p>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '10px',
                      marginTop: '6px',
                      fontSize: '0.74rem',
                      color: '#94a3b8'
                    }}
                  >
                    {activePhoto.album_nombre && <span>📂 {activePhoto.album_nombre}</span>}
                    {activePhoto.colonia_nombre && (
                      <span>
                        <MapPin size={12} style={{ verticalAlign: 'middle' }} /> {activePhoto.colonia_nombre}
                      </span>
                    )}
                    {activePhoto.ancho && activePhoto.alto && (
                      <span>
                        📐 {activePhoto.ancho}×{activePhoto.alto}px
                      </span>
                    )}
                    {activePhoto.bytes > 0 && <span>💾 {formatBytes(activePhoto.bytes)}</span>}
                    {activePhoto.autor_nombre && <span>👤 Subida por {activePhoto.autor_nombre}</span>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
