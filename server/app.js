require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDatabase, getDb, exportDatabase } = require('./config/database');
const { enviarEmailSuspension, enviarEmailBackup } = require('./services/emailService');
const cloudinaryService = require('./services/cloudinaryService');

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;
const INSECURE_SECRETS = ['valle_viejo_colonias_secret_2025', 'cambiar_por_secreto_largo_aleatorio'];

if (!JWT_SECRET || INSECURE_SECRETS.includes(JWT_SECRET) || JWT_SECRET.length < 32) {
  if (IS_PROD) {
    console.error('❌ JWT_SECRET no definido o inseguro (mínimo 32 caracteres aleatorios). El servidor no inicia en producción.');
    process.exit(1);
  }
  console.warn('⚠️  JWT_SECRET no definido o débil. Usá uno largo y aleatorio en .env (obligatorio en producción).');
}
const SIGNING_SECRET = JWT_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

// Railway / proxies: necesario para que el rate limit use la IP real del cliente
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        'connect-src': ["'self'", 'https://api.cloudinary.com'],
        'upgrade-insecure-requests': null
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS: el front se sirve desde el mismo origen. Solo se habilita si se define CORS_ORIGIN.
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
}
app.use(express.json({ limit: '200kb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  next();
});

const limiteMsg = (error) => ({ error });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: limiteMsg('Demasiados intentos de ingreso. Esperá 15 minutos e intentá de nuevo.')
});
const inscripcionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: limiteMsg('Demasiadas inscripciones desde esta conexión. Intentá más tarde.')
});
const consultaPublicaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: limiteMsg('Demasiadas consultas. Esperá un minuto.')
});

// Auth Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, SIGNING_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  // Se lee el usuario de la base en cada pedido: si un admin cambia sus permisos o lo elimina,
  // el cambio vale enseguida, sin esperar a que venza la sesión.
  const u = getDb().queryOne('SELECT id, nombre, email, rol, avatar, permisos, created_at FROM usuarios WHERE id = ?', [decoded.id]);
  if (!u) return res.status(401).json({ error: 'Tu usuario ya no existe. Pedile acceso a un administrador.' });
  req.user = usuarioPublico(u);
  next();
}

// ==================== PERMISOS ====================
// Secciones de la barra lateral que se pueden habilitar a un usuario no admin.
// Backups y Usuarios son siempre solo de admin.
const SECCIONES = ['fichas', 'dashboard', 'clima', 'galeria'];

function leerPermisos(raw) {
  let p = {};
  try {
    p = typeof raw === 'string' ? JSON.parse(raw || '{}') : raw || {};
  } catch (_) {
    p = {};
  }
  const secciones = Array.isArray(p.secciones) ? SECCIONES.filter((s) => p.secciones.includes(s)) : ['fichas'];
  return {
    secciones,
    editar_fichas: secciones.includes('fichas') && p.editar_fichas === true,
    eliminar_fichas: secciones.includes('fichas') && p.eliminar_fichas === true
  };
}

function permisosEfectivos(u) {
  if (u?.rol === 'admin') return { secciones: [...SECCIONES], editar_fichas: true, eliminar_fichas: true };
  return leerPermisos(u?.permisos);
}

function usuarioPublico(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol === 'admin' ? 'admin' : 'coordinador',
    avatar: u.avatar || null,
    created_at: u.created_at,
    permisos: permisosEfectivos(u)
  };
}

// Autorización por rol (siempre usar después de authMiddleware)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tenés permisos para realizar esta acción' });
    }
    next();
  };
}

// Pasa si el usuario tiene habilitada alguna de estas secciones
function requireSeccion(...secciones) {
  return (req, res, next) => {
    if (req.user?.rol === 'admin' || secciones.some((s) => req.user?.permisos?.secciones?.includes(s))) return next();
    return res.status(403).json({ error: 'No tenés acceso a esta sección' });
  };
}

function requirePermiso(permiso, mensaje) {
  return (req, res, next) => {
    if (req.user?.rol === 'admin' || req.user?.permisos?.[permiso] === true) return next();
    return res.status(403).json({ error: mensaje || 'No tenés permisos para realizar esta acción' });
  };
}

// Celular argentino -> 10 dígitos (código de área + número, sin 0 ni 15). null si no se puede interpretar.
// Acepta "383 4512345", "0383 15 4512345", "+54 9 383 4512345", etc.
function normalizarCelular(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2);
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) {
    // Sacar el "15" que va después del código de área (de 2 a 4 dígitos)
    for (const i of [2, 3, 4]) {
      if (d.substr(i, 2) === '15') {
        d = d.slice(0, i) + d.slice(i + 2);
        break;
      }
    }
  }
  return /^[1-9]\d{9}$/.test(d) ? d : null;
}

// Helper to build full medical record object
function getFullInscripcionById(id) {
  const { queryOne } = getDb();
  const ins = queryOne(
    `SELECT i.*, c.nombre as colonia_nombre, c.sede as colonia_sede, c.turno as colonia_turno, c.direccion as colonia_direccion
     FROM inscripciones i
     LEFT JOIN colonias c ON c.id = i.colonia_id
     WHERE i.id = ?`,
    [id]
  );
  if (!ins) return null;

  const padre = queryOne('SELECT * FROM datos_padre WHERE inscripcion_id = ?', [id]) || {};
  const nino = queryOne('SELECT * FROM datos_nino WHERE inscripcion_id = ?', [id]) || {};
  const medica = queryOne('SELECT * FROM ficha_medica WHERE inscripcion_id = ?', [id]) || {};

  return {
    ...ins,
    padre,
    nino,
    medica
  };
}

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  const { queryOne } = getDb();

  if (!email || !password) {
    return res.status(400).json({ error: 'Ingresá tu correo y contraseña' });
  }

  const user = queryOne('SELECT * FROM usuarios WHERE lower(email) = lower(?)', [email.trim()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    SIGNING_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  res.json({ token, user: usuarioPublico(user) });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ==================== USUARIOS (solo admin) ====================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida y normaliza los datos de un usuario. Devuelve { error } o { datos }.
function validarUsuario(body, { esNuevo }) {
  const nombre = String(body.nombre || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = body.password ? String(body.password) : '';
  const rol = body.rol === 'admin' ? 'admin' : 'coordinador';

  if (!nombre || nombre.length > 80) return { error: 'Escribí el nombre (hasta 80 letras).' };
  if (!EMAIL_RE.test(email) || email.length > 120) return { error: 'Escribí un correo válido.' };
  if (esNuevo && !password) return { error: 'Escribí una contraseña.' };
  if (password && (password.length < 8 || password.length > 100)) {
    return { error: 'La contraseña tiene que tener al menos 8 caracteres.' };
  }

  let permisos = null;
  if (rol !== 'admin') {
    permisos = leerPermisos(body.permisos);
    if (permisos.secciones.length === 0) return { error: 'Elegí al menos una sección que pueda ver.' };
  }
  return { datos: { nombre, email, password, rol, permisos } };
}

function contarAdmins(excluirId) {
  const r = getDb().queryOne("SELECT COUNT(*) as n FROM usuarios WHERE rol = 'admin' AND id != ?", [excluirId || 0]);
  return r ? r.n : 0;
}

app.get('/api/auth/usuarios', authMiddleware, requireRole('admin'), (req, res) => {
  const { queryAll } = getDb();
  const usuarios = queryAll('SELECT id, nombre, email, rol, avatar, permisos, created_at FROM usuarios ORDER BY nombre COLLATE NOCASE ASC');
  res.json(usuarios.map(usuarioPublico));
});

app.post('/api/auth/usuarios', authMiddleware, requireRole('admin'), (req, res) => {
  const { error, datos } = validarUsuario(req.body || {}, { esNuevo: true });
  if (error) return res.status(400).json({ error });
  const { queryOne, runQueryAndSave } = getDb();

  if (queryOne('SELECT id FROM usuarios WHERE lower(email) = lower(?)', [datos.email])) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
  }
  const result = runQueryAndSave('INSERT INTO usuarios (nombre, email, password_hash, rol, permisos) VALUES (?, ?, ?, ?, ?)', [
    datos.nombre,
    datos.email,
    bcrypt.hashSync(datos.password, 10),
    datos.rol,
    datos.permisos ? JSON.stringify(datos.permisos) : null
  ]);
  const creado = queryOne('SELECT id, nombre, email, rol, avatar, permisos, created_at FROM usuarios WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(usuarioPublico(creado));
});

app.put('/api/auth/usuarios/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { queryOne, runQueryAndSave } = getDb();
  const actual = queryOne('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
  if (!actual) return res.status(404).json({ error: 'Ese usuario ya no existe.' });

  const { error, datos } = validarUsuario(req.body || {}, { esNuevo: false });
  if (error) return res.status(400).json({ error });

  if (actual.rol === 'admin' && datos.rol !== 'admin') {
    if (id === Number(req.user.id)) {
      return res.status(400).json({ error: 'No podés quitarte a vos mismo el acceso de administrador.' });
    }
    if (contarAdmins(id) === 0) {
      return res.status(400).json({ error: 'Tiene que quedar al menos un administrador.' });
    }
  }
  if (queryOne('SELECT id FROM usuarios WHERE lower(email) = lower(?) AND id != ?', [datos.email, id])) {
    return res.status(409).json({ error: 'Ya existe otro usuario con ese correo.' });
  }

  const permisosJson = datos.permisos ? JSON.stringify(datos.permisos) : null;
  if (datos.password) {
    runQueryAndSave('UPDATE usuarios SET nombre = ?, email = ?, rol = ?, permisos = ?, password_hash = ? WHERE id = ?', [
      datos.nombre, datos.email, datos.rol, permisosJson, bcrypt.hashSync(datos.password, 10), id
    ]);
  } else {
    runQueryAndSave('UPDATE usuarios SET nombre = ?, email = ?, rol = ?, permisos = ? WHERE id = ?', [
      datos.nombre, datos.email, datos.rol, permisosJson, id
    ]);
  }
  const editado = queryOne('SELECT id, nombre, email, rol, avatar, permisos, created_at FROM usuarios WHERE id = ?', [id]);
  res.json(usuarioPublico(editado));
});

app.delete('/api/auth/usuarios/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const { queryOne, runQueryAndSave } = getDb();
  const actual = queryOne('SELECT id, rol FROM usuarios WHERE id = ?', [id]);
  if (!actual) return res.status(404).json({ error: 'Ese usuario ya no existe.' });
  if (id === Number(req.user.id)) return res.status(400).json({ error: 'No podés eliminar tu propio usuario.' });
  if (actual.rol === 'admin' && contarAdmins(id) === 0) {
    return res.status(400).json({ error: 'Tiene que quedar al menos un administrador.' });
  }
  runQueryAndSave('DELETE FROM usuarios WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ==================== COLONIAS ROUTES ====================

app.get('/api/colonias', (req, res) => {
  vencerAlertas();
  const { queryAll } = getDb();
  const colonias = queryAll(`
    SELECT c.*,
      (SELECT COUNT(*) FROM inscripciones i WHERE i.colonia_id = c.id AND i.estado = 'activo') as total_inscriptos
    FROM colonias c
    ORDER BY c.id ASC
  `);
  res.json(colonias);
});

app.post('/api/colonias', authMiddleware, requireRole('admin'), (req, res) => {
  const {
    nombre, sede, direccion, descripcion, turno,
    edades, coordinador_responsable, telefono_sede, fecha_inicio, fecha_fin
  } = req.body;
  const { runQuery, queryOne } = getDb();

  if (!nombre || !sede || !direccion) {
    return res.status(400).json({ error: 'Nombre, sede y dirección son obligatorios' });
  }

  const result = runQuery(
    `INSERT INTO colonias (nombre, sede, direccion, descripcion, turno, edades, coordinador_responsable, telefono_sede, fecha_inicio, fecha_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre, sede, direccion, descripcion || '',
      turno || 'Mañana (08:30 a 12:30 hs)',
      edades || '5 a 13 años',
      coordinador_responsable || '',
      telefono_sede || '',
      fecha_inicio || '2025-01-06',
      fecha_fin || '2025-02-21'
    ]
  );

  const nueva = queryOne('SELECT * FROM colonias WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(nueva);
});

app.put('/api/colonias/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const {
    nombre, sede, direccion, descripcion, turno,
    edades, coordinador_responsable, telefono_sede,
    fecha_inicio, fecha_fin, activa, suspendida, motivo_suspension
  } = req.body;
  const { runQuery, queryOne } = getDb();

  runQuery(
    `UPDATE colonias SET
      nombre = COALESCE(?, nombre),
      sede = COALESCE(?, sede),
      direccion = COALESCE(?, direccion),
      descripcion = COALESCE(?, descripcion),
      turno = COALESCE(?, turno),
      edades = COALESCE(?, edades),
      coordinador_responsable = COALESCE(?, coordinador_responsable),
      telefono_sede = COALESCE(?, telefono_sede),
      fecha_inicio = COALESCE(?, fecha_inicio),
      fecha_fin = COALESCE(?, fecha_fin),
      activa = COALESCE(?, activa),
      suspendida = COALESCE(?, suspendida),
      motivo_suspension = COALESCE(?, motivo_suspension)
     WHERE id = ?`,
    [
      nombre ?? null, sede ?? null, direccion ?? null, descripcion ?? null,
      turno ?? null, edades ?? null, coordinador_responsable ?? null,
      telefono_sede ?? null, fecha_inicio ?? null, fecha_fin ?? null,
      activa !== undefined ? (activa ? 1 : 0) : null,
      suspendida !== undefined ? (suspendida ? 1 : 0) : null,
      motivo_suspension ?? null,
      id
    ]
  );

  const actualizada = queryOne('SELECT * FROM colonias WHERE id = ?', [id]);
  res.json(actualizada);
});

app.delete('/api/colonias/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { queryOne, runQuery } = getDb();
  const insActivas = queryOne(
    "SELECT COUNT(*) as total FROM inscripciones WHERE colonia_id = ? AND estado = 'activo'",
    [id]
  );
  if (insActivas && insActivas.total > 0) {
    return res.status(409).json({
      error: `No se puede eliminar: la localidad tiene ${insActivas.total} inscripción/es activa/s. Pasalas a otra localidad antes de eliminarla.`
    });
  }
  runQuery('DELETE FROM colonias WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ==================== VERIFICAR DNI EN TIEMPO REAL ====================

app.get('/api/inscripciones/verificar-dni/:dni', consultaPublicaLimiter, (req, res) => {
  const cleanDni = String(req.params.dni || '').replace(/\D/g, '');
  if (!cleanDni || cleanDni.length < 6) {
    return res.json({ existe: false });
  }

  const { queryOne } = getDb();
  const existente = queryOne(
    `SELECT n.id FROM datos_nino n
     WHERE REPLACE(REPLACE(n.dni, '.', ''), ' ', '') = ?`,
    [cleanDni]
  );

  // Solo se informa si existe: nunca se devuelven datos del niño, del tutor ni de la sede.
  res.json({ existe: Boolean(existente) });
});

// ==================== INSCRIPCIONES & FICHAS MEDICAS ====================

app.get('/api/inscripciones', authMiddleware, requireSeccion('fichas', 'dashboard'), (req, res) => {
  const { queryAll } = getDb();
  const rows = queryAll(`
    SELECT
      i.id, i.colonia_id, i.nro_ficha, i.fecha_inscripcion, i.autorizado, i.estado,
      i.firma_padre_texto, i.firma_profesional_texto,
      c.nombre as colonia_nombre, c.sede as colonia_sede, c.turno as colonia_turno,
      n.apellido_nombre as nino_nombre, n.dni as nino_dni, n.fecha_nacimiento, n.edad,
      n.domicilio, n.tiene_obra_social, n.obra_social_nombre, n.esquema_vacunacion,
      n.telefono_nino, n.presion_arterial, n.presion_alta, n.presion_baja,
      n.peso, n.talla, n.imc, n.circunferencia_cintura,
      p.apellido_nombre as padre_nombre, p.parentesco, p.dni as padre_dni,
      p.telefono as padre_telefono, p.whatsapp as padre_whatsapp, p.email as padre_email,
      p.contacto_urgencia,
      m.recibe_atencion_medica, m.atencion_medica_detalle,
      m.alergias_si, m.alergias_cual,
      m.cardiacas_si, m.cardiacas_cual,
      m.rinones_si, m.rinones_cual,
      m.oncologicas_si, m.oncologicas_cual,
      m.tiroides_si, m.tiroides_cual,
      m.asmas_si, m.asmas_cual,
      m.diabetes_si, m.diabetes_cual,
      m.neurologicas_si, m.neurologicas_cual,
      m.oftalmologicas_si, m.oftalmologicas_cual,
      m.auditivas_si, m.auditivas_cual,
      m.celiaquia_si, m.celiaquia_cual,
      m.discapacidad_si, m.discapacidad_cual,
      m.otras_si, m.otras_cual,
      m.antecedentes_personales, m.observaciones
    FROM inscripciones i
    LEFT JOIN colonias c ON c.id = i.colonia_id
    LEFT JOIN datos_nino n ON n.inscripcion_id = i.id
    LEFT JOIN datos_padre p ON p.inscripcion_id = i.id
    LEFT JOIN ficha_medica m ON m.inscripcion_id = i.id
    ORDER BY i.id DESC
  `);

  res.json(rows);
});

app.get('/api/inscripciones/:id', authMiddleware, requireSeccion('fichas', 'dashboard'), (req, res) => {
  const full = getFullInscripcionById(req.params.id);
  if (!full) return res.status(404).json({ error: 'Ficha médica no encontrada' });
  res.json(full);
});

// Acceso de la familia a su propia ficha mediante un link secreto (token aleatorio, no adivinable)
app.get('/api/fichas/publica/:token', consultaPublicaLimiter, (req, res) => {
  const token = String(req.params.token || '');
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return res.status(404).json({ error: 'Ficha médica no encontrada' });
  }
  const { queryOne } = getDb();
  const row = queryOne('SELECT id FROM inscripciones WHERE token_publico = ?', [token]);
  if (!row) return res.status(404).json({ error: 'Ficha médica no encontrada' });
  const full = getFullInscripcionById(row.id);
  delete full.token_publico;
  res.json(full);
});

app.post('/api/inscripciones', inscripcionLimiter, (req, res) => {
  const { colonia_id, autorizado, firma_padre_texto, padre = {}, nino = {}, medica = {} } = req.body;
  const { queryOne, runQuery } = getDb();

  const cleanDni = String(nino.dni || '').replace(/\D/g, '');
  if (!colonia_id || !cleanDni || !nino.apellido_nombre || !padre.apellido_nombre) {
    return res.status(400).json({ error: 'Por favor completá los datos obligatorios del niño/a y del padre/madre/tutor.' });
  }

  const celularPadre = normalizarCelular(padre.whatsapp || padre.telefono);
  if (!celularPadre) {
    return res.status(400).json({
      error: 'Revisá tu celular: escribilo con código de área, sin 0 ni 15. Por ejemplo: 3834512345.'
    });
  }

  // Check duplicate DNI
  const dup = queryOne(
    `SELECT n.id FROM datos_nino n
     WHERE REPLACE(REPLACE(n.dni, '.', ''), ' ', '') = ?`,
    [cleanDni]
  );

  if (dup) {
    return res.status(409).json({
      error: 'Este niño/a ya se encuentra inscripto. Si necesitás una copia o corregir datos, comunicate con la coordinación.'
    });
  }

  // Número de ficha: correlativo dentro de la temporada activa
  const temporada = Number(process.env.TEMPORADA_ACTUAL) || new Date().getFullYear();
  const prefijo = `VV-${temporada}-`;
  const lastFicha = queryOne(
    'SELECT nro_ficha FROM inscripciones WHERE nro_ficha LIKE ? ORDER BY id DESC LIMIT 1',
    [prefijo + '%']
  );
  const ultimoNum = lastFicha
    ? Number(lastFicha.nro_ficha.replace(prefijo, '')) || 0
    : 0;
  const nro_ficha = prefijo + String(ultimoNum + 1).padStart(4, '0');

  const { transaction } = getDb();
  let creada;
  try {
    creada = transaction(() => {
  const insResult = runQuery(
    `INSERT INTO inscripciones (colonia_id, nro_ficha, token_publico, autorizado, firma_padre_texto, firma_profesional_texto)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Number(colonia_id),
      nro_ficha,
      crypto.randomBytes(24).toString('hex'),
      autorizado ? 1 : 0,
      firma_padre_texto || padre.apellido_nombre,
      medica.firma_profesional_texto || ''
    ]
  );

  const inscripcionId = insResult.lastInsertRowid;

  runQuery(
    `INSERT INTO datos_padre (inscripcion_id, apellido_nombre, parentesco, dni, telefono, whatsapp, email, contacto_urgencia, acepta_whatsapp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inscripcionId,
      padre.apellido_nombre.trim(),
      padre.parentesco || 'Padre/Madre/Tutor',
      String(padre.dni || '').replace(/\D/g, ''),
      celularPadre,
      `549${celularPadre}`,
      (padre.email || '').trim(),
      padre.contacto_urgencia || padre.telefono || '',
      padre.acepta_whatsapp === false ? 0 : 1
    ]
  );

  runQuery(
    `INSERT INTO datos_nino (
      inscripcion_id, apellido_nombre, dni, fecha_nacimiento, edad, domicilio,
      tiene_obra_social, obra_social_nombre, esquema_vacunacion, telefono_nino,
      presion_arterial, presion_alta, presion_baja, peso, talla, imc, circunferencia_cintura
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inscripcionId,
      nino.apellido_nombre.trim(),
      cleanDni,
      nino.fecha_nacimiento || '',
      Number(nino.edad || 0),
      nino.domicilio || '',
      nino.tiene_obra_social ? 1 : 0,
      nino.obra_social_nombre || '',
      nino.esquema_vacunacion || 'Completo',
      nino.telefono_nino || padre.telefono || '',
      nino.presion_arterial || (nino.presion_alta && nino.presion_baja ? `${nino.presion_alta}/${nino.presion_baja}` : ''),
      nino.presion_alta || '',
      nino.presion_baja || '',
      nino.peso || '',
      nino.talla || '',
      nino.imc || '',
      nino.circunferencia_cintura || ''
    ]
  );

  runQuery(
    `INSERT INTO ficha_medica (
      inscripcion_id, recibe_atencion_medica, atencion_medica_detalle,
      alergias_si, alergias_cual,
      cardiacas_si, cardiacas_cual,
      rinones_si, rinones_cual,
      oncologicas_si, oncologicas_cual,
      tiroides_si, tiroides_cual,
      asmas_si, asmas_cual,
      diabetes_si, diabetes_cual,
      neurologicas_si, neurologicas_cual,
      oftalmologicas_si, oftalmologicas_cual,
      auditivas_si, auditivas_cual,
      celiaquia_si, celiaquia_cual,
      discapacidad_si, discapacidad_cual,
      otras_si, otras_cual,
      antecedentes_personales, observaciones
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      inscripcionId,
      medica.recibe_atencion_medica ? 1 : 0,
      medica.atencion_medica_detalle || '',
      medica.alergias_si ? 1 : 0, medica.alergias_cual || '',
      medica.cardiacas_si ? 1 : 0, medica.cardiacas_cual || '',
      medica.rinones_si ? 1 : 0, medica.rinones_cual || '',
      medica.oncologicas_si ? 1 : 0, medica.oncologicas_cual || '',
      medica.tiroides_si ? 1 : 0, medica.tiroides_cual || '',
      medica.asmas_si ? 1 : 0, medica.asmas_cual || '',
      medica.diabetes_si ? 1 : 0, medica.diabetes_cual || '',
      medica.neurologicas_si ? 1 : 0, medica.neurologicas_cual || '',
      medica.oftalmologicas_si ? 1 : 0, medica.oftalmologicas_cual || '',
      medica.auditivas_si ? 1 : 0, medica.auditivas_cual || '',
      medica.celiaquia_si ? 1 : 0, medica.celiaquia_cual || '',
      medica.discapacidad_si ? 1 : 0, medica.discapacidad_cual || '',
      medica.otras_si ? 1 : 0, medica.otras_cual || '',
      medica.antecedentes_personales || '',
      medica.observaciones || ''
    ]
  );

      return getFullInscripcionById(inscripcionId);
    });
  } catch (err) {
    console.error('Error al crear inscripción:', err.message);
    return res.status(500).json({ error: 'Error interno al guardar la inscripción. Intentá de nuevo.' });
  }
  res.status(201).json(creada);
});

app.put('/api/inscripciones/:id', authMiddleware, requirePermiso('editar_fichas', 'No tenés permiso para editar fichas.'), (req, res) => {
  const { id } = req.params;
  const { colonia_id, autorizado, firma_padre_texto, firma_profesional_texto, padre = {}, nino = {}, medica = {} } = req.body;
  const { runQuery } = getDb();

  if (colonia_id !== undefined || autorizado !== undefined || firma_padre_texto !== undefined || firma_profesional_texto !== undefined) {
    runQuery(
      `UPDATE inscripciones SET
        colonia_id = COALESCE(?, colonia_id),
        autorizado = COALESCE(?, autorizado),
        firma_padre_texto = COALESCE(?, firma_padre_texto),
        firma_profesional_texto = COALESCE(?, firma_profesional_texto)
       WHERE id = ?`,
      [
        colonia_id ?? null,
        autorizado !== undefined ? (autorizado ? 1 : 0) : null,
        firma_padre_texto ?? null,
        firma_profesional_texto ?? null,
        id
      ]
    );
  }

  if (Object.keys(padre).length > 0) {
    runQuery(
      `UPDATE datos_padre SET
        apellido_nombre = COALESCE(?, apellido_nombre),
        parentesco = COALESCE(?, parentesco),
        dni = COALESCE(?, dni),
        telefono = COALESCE(?, telefono),
        whatsapp = COALESCE(?, whatsapp),
        email = COALESCE(?, email),
        contacto_urgencia = COALESCE(?, contacto_urgencia)
       WHERE inscripcion_id = ?`,
      [
        padre.apellido_nombre ?? null,
        padre.parentesco ?? null,
        padre.dni ?? null,
        padre.telefono ?? null,
        padre.whatsapp ?? null,
        padre.email ?? null,
        padre.contacto_urgencia ?? null,
        id
      ]
    );
  }

  if (Object.keys(nino).length > 0) {
    runQuery(
      `UPDATE datos_nino SET
        apellido_nombre = COALESCE(?, apellido_nombre),
        fecha_nacimiento = COALESCE(?, fecha_nacimiento),
        edad = COALESCE(?, edad),
        domicilio = COALESCE(?, domicilio),
        tiene_obra_social = COALESCE(?, tiene_obra_social),
        obra_social_nombre = COALESCE(?, obra_social_nombre),
        esquema_vacunacion = COALESCE(?, esquema_vacunacion),
        telefono_nino = COALESCE(?, telefono_nino),
        presion_arterial = COALESCE(?, presion_arterial),
        presion_alta = COALESCE(?, presion_alta),
        presion_baja = COALESCE(?, presion_baja),
        peso = COALESCE(?, peso),
        talla = COALESCE(?, talla),
        imc = COALESCE(?, imc),
        circunferencia_cintura = COALESCE(?, circunferencia_cintura)
       WHERE inscripcion_id = ?`,
      [
        nino.apellido_nombre ?? null,
        nino.fecha_nacimiento ?? null,
        nino.edad ?? null,
        nino.domicilio ?? null,
        nino.tiene_obra_social !== undefined ? (nino.tiene_obra_social ? 1 : 0) : null,
        nino.obra_social_nombre ?? null,
        nino.esquema_vacunacion ?? null,
        nino.telefono_nino ?? null,
        nino.presion_arterial ?? null,
        nino.presion_alta ?? null,
        nino.presion_baja ?? null,
        nino.peso ?? null,
        nino.talla ?? null,
        nino.imc ?? null,
        nino.circunferencia_cintura ?? null,
        id
      ]
    );
  }

  if (Object.keys(medica).length > 0) {
    runQuery(
      `UPDATE ficha_medica SET
        recibe_atencion_medica = COALESCE(?, recibe_atencion_medica),
        atencion_medica_detalle = COALESCE(?, atencion_medica_detalle),
        alergias_si = COALESCE(?, alergias_si), alergias_cual = COALESCE(?, alergias_cual),
        cardiacas_si = COALESCE(?, cardiacas_si), cardiacas_cual = COALESCE(?, cardiacas_cual),
        rinones_si = COALESCE(?, rinones_si), rinones_cual = COALESCE(?, rinones_cual),
        oncologicas_si = COALESCE(?, oncologicas_si), oncologicas_cual = COALESCE(?, oncologicas_cual),
        tiroides_si = COALESCE(?, tiroides_si), tiroides_cual = COALESCE(?, tiroides_cual),
        asmas_si = COALESCE(?, asmas_si), asmas_cual = COALESCE(?, asmas_cual),
        diabetes_si = COALESCE(?, diabetes_si), diabetes_cual = COALESCE(?, diabetes_cual),
        neurologicas_si = COALESCE(?, neurologicas_si), neurologicas_cual = COALESCE(?, neurologicas_cual),
        oftalmologicas_si = COALESCE(?, oftalmologicas_si), oftalmologicas_cual = COALESCE(?, oftalmologicas_cual),
        auditivas_si = COALESCE(?, auditivas_si), auditivas_cual = COALESCE(?, auditivas_cual),
        celiaquia_si = COALESCE(?, celiaquia_si), celiaquia_cual = COALESCE(?, celiaquia_cual),
        discapacidad_si = COALESCE(?, discapacidad_si), discapacidad_cual = COALESCE(?, discapacidad_cual),
        otras_si = COALESCE(?, otras_si), otras_cual = COALESCE(?, otras_cual),
        antecedentes_personales = COALESCE(?, antecedentes_personales),
        observaciones = COALESCE(?, observaciones)
       WHERE inscripcion_id = ?`,
      [
        medica.recibe_atencion_medica !== undefined ? (medica.recibe_atencion_medica ? 1 : 0) : null,
        medica.atencion_medica_detalle ?? null,
        medica.alergias_si !== undefined ? (medica.alergias_si ? 1 : 0) : null, medica.alergias_cual ?? null,
        medica.cardiacas_si !== undefined ? (medica.cardiacas_si ? 1 : 0) : null, medica.cardiacas_cual ?? null,
        medica.rinones_si !== undefined ? (medica.rinones_si ? 1 : 0) : null, medica.rinones_cual ?? null,
        medica.oncologicas_si !== undefined ? (medica.oncologicas_si ? 1 : 0) : null, medica.oncologicas_cual ?? null,
        medica.tiroides_si !== undefined ? (medica.tiroides_si ? 1 : 0) : null, medica.tiroides_cual ?? null,
        medica.asmas_si !== undefined ? (medica.asmas_si ? 1 : 0) : null, medica.asmas_cual ?? null,
        medica.diabetes_si !== undefined ? (medica.diabetes_si ? 1 : 0) : null, medica.diabetes_cual ?? null,
        medica.neurologicas_si !== undefined ? (medica.neurologicas_si ? 1 : 0) : null, medica.neurologicas_cual ?? null,
        medica.oftalmologicas_si !== undefined ? (medica.oftalmologicas_si ? 1 : 0) : null, medica.oftalmologicas_cual ?? null,
        medica.auditivas_si !== undefined ? (medica.auditivas_si ? 1 : 0) : null, medica.auditivas_cual ?? null,
        medica.celiaquia_si !== undefined ? (medica.celiaquia_si ? 1 : 0) : null, medica.celiaquia_cual ?? null,
        medica.discapacidad_si !== undefined ? (medica.discapacidad_si ? 1 : 0) : null, medica.discapacidad_cual ?? null,
        medica.otras_si !== undefined ? (medica.otras_si ? 1 : 0) : null, medica.otras_cual ?? null,
        medica.antecedentes_personales ?? null,
        medica.observaciones ?? null,
        id
      ]
    );
  }

  const updated = getFullInscripcionById(id);
  res.json(updated);
});

app.delete('/api/inscripciones/:id', authMiddleware, requirePermiso('eliminar_fichas', 'No tenés permiso para eliminar fichas.'), (req, res) => {
  const { id } = req.params;
  const { runQuery, transaction } = getDb();
  try {
    transaction(() => {
      // Con PRAGMA foreign_keys = ON los CASCADE borran las tablas hijas automáticamente.
      // Estos deletes manuales son el fallback por si la migración todavía no activó FK.
      runQuery('DELETE FROM datos_padre WHERE inscripcion_id = ?', [id]);
      runQuery('DELETE FROM datos_nino WHERE inscripcion_id = ?', [id]);
      runQuery('DELETE FROM ficha_medica WHERE inscripcion_id = ?', [id]);
      runQuery('DELETE FROM inscripciones WHERE id = ?', [id]);
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar la ficha.' });
  }
});

// ==================== ALERTAS Y DIFUSIÓN (CLIMA / SUSPENSIONES) ====================

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-01-12 08:30:00" -> "lunes 12 de enero" (las fechas de la base ya están en hora local)
function fechaLarga(raw) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw || ''));
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// Localidades que abarca un aviso: lista de ids, o null si es para todas
function alcanceIds(alerta) {
  if (alerta.colonias) {
    return String(alerta.colonias)
      .split(',')
      .map(Number)
      .filter((n) => n > 0);
  }
  return alerta.colonia_id ? [Number(alerta.colonia_id)] : null;
}

// Lo que manda el panel ([1, 3], "1,3" o un id suelto) -> ids válidos sin repetir; null si son todas.
// Devuelve [] si no eligieron ninguna válida.
function parsearAlcance(raw) {
  if (raw === null || raw === undefined || raw === '' || raw === 'todas') return null;
  const lista = Array.isArray(raw) ? raw : String(raw).split(',');
  const pedidos = [...new Set(lista.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  const todas = getDb().queryAll('SELECT id FROM colonias').map((c) => c.id);
  const ids = pedidos.filter((id) => todas.includes(id));
  if (ids.length > 0 && ids.length === todas.length) return null;
  return ids;
}

// Cada colonia queda suspendida solo si tiene un aviso activo que la suspende (propio o para todas las localidades)
function recalcularSuspensiones() {
  const { queryAll, runQuery } = getDb();
  const suspensiones = queryAll('SELECT * FROM alertas WHERE activa = 1 AND suspende = 1 ORDER BY id DESC');
  for (const col of queryAll('SELECT id FROM colonias')) {
    const aviso = suspensiones.find((a) => {
      const ids = alcanceIds(a);
      return !ids || ids.includes(col.id);
    });
    if (aviso) {
      runQuery('UPDATE colonias SET suspendida = 1, motivo_suspension = ? WHERE id = ?', [aviso.mensaje, col.id]);
    } else {
      runQuery('UPDATE colonias SET suspendida = 0, motivo_suspension = NULL WHERE id = ?', [col.id]);
    }
  }
}

// Los avisos "solo por hoy" se terminan solos cuando pasa el día
function vencerAlertas() {
  const { queryOne, runQuery, saveDatabase } = getDb();
  const hay = queryOne(
    "SELECT COUNT(*) AS n FROM alertas WHERE activa = 1 AND vence IS NOT NULL AND vence < date('now', 'localtime')"
  );
  if (!hay || !hay.n) return;
  runQuery(
    "UPDATE alertas SET activa = 0, finalizada_at = datetime('now', 'localtime') WHERE activa = 1 AND vence IS NOT NULL AND vence < date('now', 'localtime')"
  );
  recalcularSuspensiones();
  saveDatabase();
}

// Familias de las localidades elegidas (ids, o null = todas): una por teléfono/correo, con todos sus chicos juntos
function familiasDe(ids) {
  const { queryAll } = getDb();
  const filas = queryAll(
    `SELECT p.apellido_nombre, p.telefono, p.whatsapp, p.email, p.acepta_whatsapp,
            n.apellido_nombre AS nino_nombre, c.nombre AS colonia_nombre
     FROM datos_padre p
     INNER JOIN inscripciones i ON i.id = p.inscripcion_id
     LEFT JOIN datos_nino n ON n.inscripcion_id = i.id
     LEFT JOIN colonias c ON c.id = i.colonia_id
     WHERE i.estado = 'activo' ${ids ? `AND i.colonia_id IN (${ids.map(() => '?').join(', ') || 'NULL'})` : ''}
     ORDER BY p.apellido_nombre`,
    ids || []
  );
  const mapa = new Map();
  for (const f of filas) {
    const cel = normalizarCelular(f.whatsapp || f.telefono);
    // Quien dijo que no quiere WhatsApp no entra en la lista de envío uno por uno
    const tel = cel && f.acepta_whatsapp !== 0 ? `549${cel}` : '';
    const email = String(f.email || '').trim().toLowerCase();
    const key = tel || email;
    if (!key) continue;
    if (!mapa.has(key)) {
      mapa.set(key, { ...f, tel, email: email || null, ninos: f.nino_nombre ? [f.nino_nombre] : [] });
    } else if (f.nino_nombre) {
      mapa.get(key).ninos.push(f.nino_nombre);
    }
  }
  return Array.from(mapa.values()).map((f) => ({ ...f, nino_nombre: f.ninos.join(' y ') }));
}

function textoWhatsApp(alerta, coloniaNombre, familia) {
  const fecha = fechaLarga(alerta.created_at);
  const saludo = familia
    ? `Hola ${familia.apellido_nombre}${familia.nino_nombre ? `, te escribimos por ${familia.nino_nombre}` : ''}.\n\n`
    : '';
  return (
    `*Colonias de Verano · Municipalidad de Valle Viejo*\n` +
    `Aviso del ${fecha} · ${coloniaNombre}\n\n` +
    saludo +
    `*${alerta.titulo}*\n${alerta.mensaje}`
  );
}

function linksWhatsApp(familias, alerta, coloniaNombre) {
  return familias
    .filter((f) => f.tel)
    .map((f) => {
      const phone = f.tel;
      return {
        clave: f.tel,
        padre_nombre: f.apellido_nombre,
        nino_nombre: f.nino_nombre,
        telefono: f.telefono || f.whatsapp,
        colonia_nombre: f.colonia_nombre,
        wa_link: `https://wa.me/${phone}?text=${encodeURIComponent(textoWhatsApp(alerta, coloniaNombre, f))}`
      };
    });
}

// null -> "Todas las localidades"; [1, 2] -> "UTHGRA y Las Tejas"
function nombreAlcance(ids) {
  if (!ids || ids.length === 0) return 'Todas las localidades';
  const nombres = getDb()
    .queryAll(`SELECT nombre FROM colonias WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id`, ids)
    .map((c) => c.nombre);
  if (nombres.length === 0) return 'Todas las localidades';
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

// El panel y el cartel leen "colonia_nombre": para varias localidades va la lista completa (null = todas)
function conAlcance(alerta) {
  const ids = alcanceIds(alerta);
  return { ...alerta, colonias_ids: ids, colonia_nombre: ids ? nombreAlcance(ids) : null };
}

// ==================== COMUNIDAD DE WHATSAPP ====================

const LINK_COMUNIDAD_RE = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}\/?$/;

function linkComunidad() {
  const row = getDb().queryOne("SELECT valor FROM configuracion WHERE clave = 'comunidad_whatsapp'");
  return row && row.valor ? row.valor : null;
}

// Público: el formulario y la ficha muestran el link para unirse
app.get('/api/comunidad', (req, res) => {
  res.json({ link: linkComunidad() });
});

app.put('/api/comunidad', authMiddleware, requireSeccion('clima'), (req, res) => {
  const link = String(req.body.link || '').trim();
  if (link && !LINK_COMUNIDAD_RE.test(link)) {
    return res.status(400).json({
      error: 'Ese link no es de una Comunidad de WhatsApp. Tiene que empezar con https://chat.whatsapp.com/'
    });
  }
  getDb().runQueryAndSave(
    `INSERT INTO configuracion (clave, valor, updated_at) VALUES ('comunidad_whatsapp', ?, datetime('now', 'localtime'))
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at`,
    [link || null]
  );
  res.json({ link: link || null });
});

app.get('/api/alertas', (req, res) => {
  vencerAlertas();
  const { queryAll } = getDb();
  const alertas = queryAll('SELECT * FROM alertas ORDER BY id DESC');
  res.json(alertas.map(conAlcance));
});

// Cuántas familias recibirían un aviso, para mostrarlo antes de enviar
app.get('/api/alertas/destinatarios', authMiddleware, requireSeccion('clima'), (req, res) => {
  const ids = parsearAlcance(req.query.colonia_ids ?? req.query.colonia_id);
  if (ids && ids.length === 0) return res.status(400).json({ error: 'Elegí al menos una localidad.' });
  const familias = familiasDe(ids);
  res.json({
    familias: familias.length,
    con_email: familias.filter((f) => f.email).length,
    con_telefono: familias.filter((f) => f.tel).length
  });
});

// Lista de WhatsApp de un aviso ya publicado (para retomarla después de recargar)
app.get('/api/alertas/:id/whatsapp', authMiddleware, requireSeccion('clima'), (req, res) => {
  const alerta = getDb().queryOne('SELECT * FROM alertas WHERE id = ?', [req.params.id]);
  if (!alerta) return res.status(404).json({ error: 'No encontramos ese aviso.' });
  const ids = alcanceIds(alerta);
  const coloniaNombre = nombreAlcance(ids);
  res.json({
    comunidadLink: linkComunidad(),
    mensaje: textoWhatsApp(alerta, coloniaNombre, null),
    whatsappLinks: linksWhatsApp(familiasDe(ids), alerta, coloniaNombre)
  });
});

app.post('/api/alertas', authMiddleware, requireSeccion('clima'), async (req, res) => {
  const { colonia_ids, colonia_id, titulo, mensaje, suspender_colonia, enviar_email, duracion } = req.body;
  const { queryOne, runQuery, saveDatabase } = getDb();

  if (!String(titulo || '').trim() || !String(mensaje || '').trim()) {
    return res.status(400).json({ error: 'Escribí el título y el mensaje del aviso.' });
  }
  // colonia_ids: lista de localidades (null = todas). colonia_id: forma vieja, una sola.
  const ids = parsearAlcance(colonia_ids !== undefined ? colonia_ids : colonia_id);
  if (ids && ids.length === 0) {
    return res.status(400).json({ error: 'Elegí al menos una localidad de la lista.' });
  }

  const coloniaNombre = nombreAlcance(ids);
  const suspende = suspender_colonia ? 1 : 0;
  const familias = familiasDe(ids);
  const hoy = queryOne("SELECT date('now', 'localtime') AS d").d;
  const vence = duracion === 'hasta_levantar' ? null : hoy;

  // Guardar el aviso ANTES de enviar correos (si el envío falla, el aviso queda registrado)
  let alertaId;
  getDb().transaction(() => {
    const ins = runQuery(
      `INSERT INTO alertas (colonia_id, colonias, tipo, titulo, mensaje, activa, suspende, vence, enviada_email, enviada_whatsapp, destinatarios_count, creado_por)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0, 0, ?, ?)`,
      [
        ids && ids.length === 1 ? ids[0] : null,
        ids && ids.length > 1 ? ids.join(',') : null,
        suspende ? 'suspension' : 'aviso',
        String(titulo).trim(),
        String(mensaje).trim(),
        suspende,
        vence,
        familias.length,
        req.user ? req.user.nombre : 'Administrador'
      ]
    );
    alertaId = ins.lastInsertRowid;
    recalcularSuspensiones();
  });

  const alerta = conAlcance(queryOne('SELECT * FROM alertas WHERE id = ?', [alertaId]));

  const conEmail = familias.filter((f) => f.email);
  let emailResult = { modo: 'no_pedido', enviados: 0, fallidos: 0, sin_email: familias.length - conEmail.length, previewUrl: null };
  if (enviar_email !== false && conEmail.length > 0) {
    const r = await enviarEmailSuspension({
      destinatarios: conEmail,
      titulo: alerta.titulo,
      mensaje: alerta.mensaje,
      coloniaNombre,
      fecha: fechaLarga(alerta.created_at)
    });
    emailResult = { ...r, sin_email: familias.length - conEmail.length };
    if (r.enviados > 0) {
      runQuery('UPDATE alertas SET enviada_email = 1 WHERE id = ?', [alertaId]);
      saveDatabase();
    }
  } else if (enviar_email !== false) {
    emailResult.modo = 'sin_destinatarios';
  }

  res.status(201).json({
    alerta,
    emailResult,
    comunidadLink: linkComunidad(),
    mensajeWhatsApp: textoWhatsApp(alerta, coloniaNombre, null),
    whatsappLinks: linksWhatsApp(familias, alerta, coloniaNombre)
  });
});

app.put('/api/alertas/:id/desactivar', authMiddleware, requireSeccion('clima'), (req, res) => {
  const { queryOne, runQuery, transaction } = getDb();
  const alerta = queryOne('SELECT * FROM alertas WHERE id = ?', [req.params.id]);
  if (!alerta) return res.status(404).json({ error: 'No encontramos ese aviso. Recargá la página.' });

  if (alerta.activa === 1) {
    transaction(() => {
      runQuery("UPDATE alertas SET activa = 0, finalizada_at = datetime('now', 'localtime') WHERE id = ?", [alerta.id]);
      recalcularSuspensiones();
    });
  }
  res.json({ ok: true });
});

// ==================== ESTADISTICAS DASHBOARD ====================

app.get('/api/estadisticas', authMiddleware, requireSeccion('dashboard'), (req, res) => {
  const { queryOne, queryAll } = getDb();

  const totalInscriptos = queryOne("SELECT COUNT(*) as total FROM inscripciones WHERE estado = 'activo'")?.total || 0;
  const totalColonias = queryOne('SELECT COUNT(*) as total FROM colonias WHERE activa = 1')?.total || 0;
  const conObraSocial = queryOne('SELECT COUNT(*) as total FROM datos_nino WHERE tiene_obra_social = 1')?.total || 0;
  const conAlertaMedica = queryOne(`
    SELECT COUNT(DISTINCT m.inscripcion_id) as total
    FROM ficha_medica m
    INNER JOIN inscripciones i ON i.id = m.inscripcion_id
    WHERE i.estado = 'activo'
      AND (m.alergias_si = 1 OR m.cardiacas_si = 1 OR m.asmas_si = 1 OR m.diabetes_si = 1
        OR m.neurologicas_si = 1 OR m.celiaquia_si = 1 OR m.discapacidad_si = 1
        OR m.oncologicas_si = 1 OR m.tiroides_si = 1 OR m.rinones_si = 1
        OR m.auditivas_si = 1 OR m.oftalmologicas_si = 1 OR m.otras_si = 1)
  `)?.total || 0;
  const alertasActivas = queryOne('SELECT COUNT(*) as total FROM alertas WHERE activa = 1')?.total || 0;

  const porColonia = queryAll(`
    SELECT c.id, c.nombre, c.sede, c.turno, c.suspendida,
      COUNT(i.id) as inscriptos
    FROM colonias c
    LEFT JOIN inscripciones i ON i.colonia_id = c.id AND i.estado = 'activo'
    GROUP BY c.id
    ORDER BY c.id ASC
  `);

  res.json({
    totalInscriptos,
    totalColonias,
    conObraSocial,
    conAlertaMedica,
    alertasActivas,
    porColonia
  });
});

// ==================== GALERÍA ====================

const firmaRateLimitMap = new Map();

function sanitizeText(value, maxLen) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLen);
}

function parseOptionalInt(value) {
  if (value === null || value === undefined || value === '' || value === 'todas' || value === 'todos') {
    return null;
  }
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isReadOnlyRole(user) {
  const rol = String(user?.rol || '').toLowerCase();
  return rol === 'lectura' || rol === 'readonly' || rol === 'solo_lectura';
}

function canManageResource(user, ownerId) {
  if (!user) return false;
  if (user.rol === 'admin') return true;
  if (ownerId !== null && ownerId !== undefined && Number(ownerId) === Number(user.id)) return true;
  return false;
}

function checkGaleriaConfigured(res) {
  if (!cloudinaryService.isConfigured()) {
    res.status(503).json({ error: 'Galería no configurada' });
    return false;
  }
  return true;
}

function enrichImagenRow(row) {
  if (!row) return null;
  return {
    ...row,
    thumb_url: cloudinaryService.getSignedUrl(row.public_id, {
      transformation: [
        { width: 520, height: 520, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' }
      ]
    }),
    full_url: cloudinaryService.getSignedUrl(row.public_id, {
      transformation: [
        { width: 2000, height: 2000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ]
    }),
    download_url: cloudinaryService.getDownloadUrl(row.public_id, row.formato || 'jpg')
  };
}

app.post('/api/galeria/firma', authMiddleware, requireSeccion('galeria'), (req, res) => {
  if (isReadOnlyRole(req.user)) {
    return res.status(403).json({ error: 'Tu rol no tiene permisos para subir imágenes' });
  }

  // Rate-limit básico por usuario (máx. 60 firmas por minuto)
  const now = Date.now();
  const key = String(req.user.id || req.ip);
  const bucket = firmaRateLimitMap.get(key) || { count: 0, resetAt: now + 60000 };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60000;
  }
  bucket.count += 1;
  firmaRateLimitMap.set(key, bucket);
  if (bucket.count > 60) {
    return res.status(429).json({ error: 'Demasiadas solicitudes de subida. Intentá nuevamente en un minuto.' });
  }

  if (!checkGaleriaConfigured(res)) return;

  try {
    const signed = cloudinaryService.signUpload({ folder: cloudinaryService.GALLERY_FOLDER });
    res.json(signed);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'No se pudo generar la firma de subida' });
  }
});

// --- CRUD de Álbumes (registrado ANTES de /api/galeria/:id) ---

app.get('/api/galeria/albumes', authMiddleware, requireSeccion('galeria'), (req, res) => {
  if (!checkGaleriaConfigured(res)) return;

  const { queryAll } = getDb();
  const coloniaId = parseOptionalInt(req.query.colonia_id);

  const params = [];
  let whereSql = '';
  if (coloniaId) {
    whereSql = 'WHERE a.colonia_id = ?';
    params.push(coloniaId);
  }

  const albumes = queryAll(
    `SELECT a.*,
       c.nombre as colonia_nombre,
       u.nombre as creador_nombre,
       (SELECT COUNT(*) FROM imagenes im WHERE im.album_id = a.id) as total_imagenes
     FROM albumes a
     LEFT JOIN colonias c ON c.id = a.colonia_id
     LEFT JOIN usuarios u ON u.id = a.creado_por
     ${whereSql}
     ORDER BY a.id DESC`,
    params
  );

  res.json(albumes);
});

app.post('/api/galeria/albumes', authMiddleware, requireSeccion('galeria'), (req, res) => {
  if (isReadOnlyRole(req.user)) {
    return res.status(403).json({ error: 'Tu rol no tiene permisos para crear álbumes' });
  }
  if (!checkGaleriaConfigured(res)) return;

  const { queryOne, runQuery } = getDb();
  const nombre = sanitizeText(req.body?.nombre, 120);
  const descripcion = sanitizeText(req.body?.descripcion, 500);
  const coloniaId = parseOptionalInt(req.body?.colonia_id);

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del álbum es obligatorio' });
  }

  if (coloniaId) {
    const col = queryOne('SELECT id FROM colonias WHERE id = ?', [coloniaId]);
    if (!col) {
      return res.status(400).json({ error: 'La localidad seleccionada no existe' });
    }
  }

  const result = runQuery(
    'INSERT INTO albumes (nombre, descripcion, colonia_id, creado_por) VALUES (?, ?, ?, ?)',
    [nombre, descripcion || null, coloniaId, req.user.id]
  );

  const nuevo = queryOne(
    `SELECT a.*,
       c.nombre as colonia_nombre,
       u.nombre as creador_nombre,
       0 as total_imagenes
     FROM albumes a
     LEFT JOIN colonias c ON c.id = a.colonia_id
     LEFT JOIN usuarios u ON u.id = a.creado_por
     WHERE a.id = ?`,
    [result.lastInsertRowid]
  );

  res.status(201).json(nuevo);
});

app.put('/api/galeria/albumes/:id', authMiddleware, requireSeccion('galeria'), (req, res) => {
  if (!checkGaleriaConfigured(res)) return;

  const albumId = parseOptionalInt(req.params.id);
  if (!albumId) {
    return res.status(400).json({ error: 'Identificador de álbum inválido' });
  }

  const { queryOne, runQuery } = getDb();
  const album = queryOne('SELECT * FROM albumes WHERE id = ?', [albumId]);
  if (!album) {
    return res.status(404).json({ error: 'Álbum no encontrado' });
  }

  if (!canManageResource(req.user, album.creado_por)) {
    return res.status(403).json({ error: 'No tenés permisos para editar este álbum' });
  }

  const nombre = sanitizeText(req.body?.nombre ?? album.nombre, 120);
  const descripcion =
    req.body?.descripcion !== undefined ? sanitizeText(req.body.descripcion, 500) : album.descripcion;
  const coloniaId =
    req.body?.colonia_id !== undefined ? parseOptionalInt(req.body.colonia_id) : album.colonia_id;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del álbum es obligatorio' });
  }

  runQuery(
    'UPDATE albumes SET nombre = ?, descripcion = ?, colonia_id = ? WHERE id = ?',
    [nombre, descripcion || null, coloniaId, albumId]
  );

  const actualizado = queryOne(
    `SELECT a.*,
       c.nombre as colonia_nombre,
       u.nombre as creador_nombre,
       (SELECT COUNT(*) FROM imagenes im WHERE im.album_id = a.id) as total_imagenes
     FROM albumes a
     LEFT JOIN colonias c ON c.id = a.colonia_id
     LEFT JOIN usuarios u ON u.id = a.creado_por
     WHERE a.id = ?`,
    [albumId]
  );

  res.json(actualizado);
});

app.delete('/api/galeria/albumes/:id', authMiddleware, requireSeccion('galeria'), (req, res) => {
  if (!checkGaleriaConfigured(res)) return;

  const albumId = parseOptionalInt(req.params.id);
  if (!albumId) {
    return res.status(400).json({ error: 'Identificador de álbum inválido' });
  }

  const { queryOne, runQuery } = getDb();
  const album = queryOne('SELECT * FROM albumes WHERE id = ?', [albumId]);
  if (!album) {
    return res.status(404).json({ error: 'Álbum no encontrado' });
  }

  if (!canManageResource(req.user, album.creado_por)) {
    return res.status(403).json({ error: 'No tenés permisos para eliminar este álbum' });
  }

  // Las fotos del álbum conservan su registro quedando con album_id = NULL
  runQuery('UPDATE imagenes SET album_id = NULL WHERE album_id = ?', [albumId]);
  runQuery('DELETE FROM albumes WHERE id = ?', [albumId]);

  res.json({ ok: true });
});

// --- Imágenes del Banco de Imágenes ---

app.post('/api/galeria', authMiddleware, requireSeccion('galeria'), async (req, res) => {
  if (isReadOnlyRole(req.user)) {
    return res.status(403).json({ error: 'Tu rol no tiene permisos para registrar imágenes' });
  }

  const rawPublicId = typeof req.body?.public_id === 'string' ? req.body.public_id.trim() : '';
  const validPrefix = `${cloudinaryService.GALLERY_FOLDER}/`;
  if (
    !rawPublicId ||
    rawPublicId.length > 255 ||
    !rawPublicId.startsWith(validPrefix) ||
    rawPublicId.includes('..') ||
    !/^colonias-galeria\/[a-zA-Z0-9_\-/]+$/.test(rawPublicId)
  ) {
    return res.status(400).json({ error: 'El identificador de la imagen no pertenece a la carpeta autorizada' });
  }

  if (!checkGaleriaConfigured(res)) return;

  const { queryOne, runQuery } = getDb();

  const existente = queryOne('SELECT id FROM imagenes WHERE public_id = ?', [rawPublicId]);
  if (existente) {
    return res.status(409).json({ error: 'La imagen ya se encuentra registrada en el banco' });
  }

  let cloudResource;
  try {
    cloudResource = await cloudinaryService.verifyResource(rawPublicId);
  } catch (err) {
    const code = err?.error?.http_code || err?.http_code;
    if (code === 404) {
      return res.status(400).json({ error: 'La imagen no existe en Cloudinary o no es un recurso autenticado válido' });
    }
    return res.status(502).json({ error: 'No se pudo verificar la imagen en Cloudinary' });
  }

  const titulo = sanitizeText(req.body?.titulo, 150);
  const descripcion = sanitizeText(req.body?.descripcion, 600);
  let albumId = parseOptionalInt(req.body?.album_id);
  let coloniaId = parseOptionalInt(req.body?.colonia_id);

  if (albumId) {
    const album = queryOne('SELECT id, colonia_id FROM albumes WHERE id = ?', [albumId]);
    if (!album) {
      albumId = null;
    } else if (!coloniaId && album.colonia_id) {
      coloniaId = album.colonia_id;
    }
  }

  if (coloniaId) {
    const col = queryOne('SELECT id FROM colonias WHERE id = ?', [coloniaId]);
    if (!col) coloniaId = null;
  }

  const ancho = Number.parseInt(cloudResource?.width ?? req.body?.width, 10) || null;
  const alto = Number.parseInt(cloudResource?.height ?? req.body?.height, 10) || null;
  const bytes = Number.parseInt(cloudResource?.bytes ?? req.body?.bytes, 10) || null;
  const formato = sanitizeText(cloudResource?.format ?? req.body?.format, 16).toLowerCase() || null;

  const insertRes = runQuery(
    `INSERT INTO imagenes (
      public_id, album_id, colonia_id, titulo, descripcion, ancho, alto, bytes, formato, subido_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rawPublicId,
      albumId,
      coloniaId,
      titulo || null,
      descripcion || null,
      ancho,
      alto,
      bytes,
      formato,
      req.user.id
    ]
  );

  const creada = queryOne(
    `SELECT im.*,
       a.nombre as album_nombre,
       c.nombre as colonia_nombre,
       u.nombre as autor_nombre
     FROM imagenes im
     LEFT JOIN albumes a ON a.id = im.album_id
     LEFT JOIN colonias c ON c.id = im.colonia_id
     LEFT JOIN usuarios u ON u.id = im.subido_por
     WHERE im.id = ?`,
    [insertRes.lastInsertRowid]
  );

  res.status(201).json(enrichImagenRow(creada));
});

app.get('/api/galeria', authMiddleware, requireSeccion('galeria'), (req, res) => {
  if (!checkGaleriaConfigured(res)) return;

  const { queryAll, queryOne } = getDb();

  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const rawLimit = Number.parseInt(String(req.query.limit || '24'), 10) || 24;
  const limit = Math.min(60, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];

  if (req.query.album_id === 'sin_album') {
    conditions.push('im.album_id IS NULL');
  } else {
    const albumId = parseOptionalInt(req.query.album_id);
    if (albumId) {
      conditions.push('im.album_id = ?');
      params.push(albumId);
    }
  }

  const coloniaId = parseOptionalInt(req.query.colonia_id);
  if (coloniaId) {
    conditions.push('im.colonia_id = ?');
    params.push(coloniaId);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalRow = queryOne(`SELECT COUNT(*) as total FROM imagenes im ${whereSql}`, params);
  const total = totalRow?.total || 0;

  const rows = queryAll(
    `SELECT im.*,
       a.nombre as album_nombre,
       c.nombre as colonia_nombre,
       u.nombre as autor_nombre
     FROM imagenes im
     LEFT JOIN albumes a ON a.id = im.album_id
     LEFT JOIN colonias c ON c.id = im.colonia_id
     LEFT JOIN usuarios u ON u.id = im.subido_por
     ${whereSql}
     ORDER BY im.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const items = rows.map(enrichImagenRow);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    items,
    total,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages
  });
});

app.put('/api/galeria/:id', authMiddleware, requireSeccion('galeria'), (req, res) => {
  if (!checkGaleriaConfigured(res)) return;

  const imgId = parseOptionalInt(req.params.id);
  if (!imgId) {
    return res.status(400).json({ error: 'Identificador de imagen inválido' });
  }

  const { queryOne, runQuery } = getDb();
  const img = queryOne('SELECT * FROM imagenes WHERE id = ?', [imgId]);
  if (!img) {
    return res.status(404).json({ error: 'Imagen no encontrada' });
  }

  if (!canManageResource(req.user, img.subido_por)) {
    return res.status(403).json({ error: 'No tenés permisos para editar esta imagen' });
  }

  const titulo =
    req.body?.titulo !== undefined ? sanitizeText(req.body.titulo, 150) : img.titulo;
  const descripcion =
    req.body?.descripcion !== undefined ? sanitizeText(req.body.descripcion, 600) : img.descripcion;
  const albumId =
    req.body?.album_id !== undefined ? parseOptionalInt(req.body.album_id) : img.album_id;
  const coloniaId =
    req.body?.colonia_id !== undefined ? parseOptionalInt(req.body.colonia_id) : img.colonia_id;

  runQuery(
    'UPDATE imagenes SET titulo = ?, descripcion = ?, album_id = ?, colonia_id = ? WHERE id = ?',
    [titulo || null, descripcion || null, albumId, coloniaId, imgId]
  );

  const actualizada = queryOne(
    `SELECT im.*,
       a.nombre as album_nombre,
       c.nombre as colonia_nombre,
       u.nombre as autor_nombre
     FROM imagenes im
     LEFT JOIN albumes a ON a.id = im.album_id
     LEFT JOIN colonias c ON c.id = im.colonia_id
     LEFT JOIN usuarios u ON u.id = im.subido_por
     WHERE im.id = ?`,
    [imgId]
  );

  res.json(enrichImagenRow(actualizada));
});

app.delete('/api/galeria/:id', authMiddleware, requireSeccion('galeria'), async (req, res) => {
  if (!checkGaleriaConfigured(res)) return;

  const imgId = parseOptionalInt(req.params.id);
  if (!imgId) {
    return res.status(400).json({ error: 'Identificador de imagen inválido' });
  }

  const { queryOne, runQuery } = getDb();
  const img = queryOne('SELECT * FROM imagenes WHERE id = ?', [imgId]);
  if (!img) {
    return res.status(404).json({ error: 'Imagen no encontrada' });
  }

  if (!canManageResource(req.user, img.subido_por)) {
    return res.status(403).json({ error: 'No tenés permisos para eliminar esta imagen' });
  }

  try {
    await cloudinaryService.destroy(img.public_id);
  } catch (err) {
    return res.status(502).json({ error: 'No se pudo eliminar el archivo en Cloudinary' });
  }

  runQuery('DELETE FROM imagenes WHERE id = ?', [imgId]);
  res.json({ ok: true });
});

// ==================== BACKUP ====================

const TZ_AR = 'America/Argentina/Catamarca';

// "2026-11-17 14:05:09" en hora de Argentina
function ahoraArgentina() {
  return new Date().toLocaleString('sv-SE', { timeZone: TZ_AR, hour12: false });
}

function nombreBackup() {
  return `colonias_backup_${ahoraArgentina().replace(' ', '_').replace(/:/g, '-')}.sqlite`;
}

// Descarga la base completa (.sqlite). Con este archivo se restaura todo: fichas, colonias, usuarios, avisos.
app.get('/api/backup', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const buffer = exportDatabase();
    res.set({
      'Content-Type': 'application/vnd.sqlite3',
      'Content-Disposition': `attachment; filename="${nombreBackup()}"`,
      'Content-Length': buffer.length
    });
    res.send(buffer);
  } catch (err) {
    console.error('No se pudo generar el backup:', err.message);
    res.status(500).json({ error: 'No se pudo generar el backup' });
  }
});

// Estado del backup automático (para mostrarlo en el panel; no expone la casilla completa)
app.get('/api/backup/estado', authMiddleware, requireRole('admin'), (req, res) => {
  const destino = String(process.env.BACKUP_EMAIL || '').trim();
  const smtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const horaCfg = Number(process.env.BACKUP_HORA ?? 3);
  const oculto = destino.replace(/^(.{2}).*(@.*)$/, '$1•••$2');
  res.json({
    mailDiario: Boolean(destino) && smtp,
    destino: destino ? oculto : null,
    faltaSmtp: Boolean(destino) && !smtp,
    hora: Number.isInteger(horaCfg) && horaCfg >= 0 && horaCfg <= 23 ? horaCfg : 3
  });
});

// Backup automático por mail: solo si BACKUP_EMAIL está configurado (y SMTP también).
// Se manda una vez al día a la hora BACKUP_HORA (0-23, hora de Argentina; por defecto 3).
function programarBackupDiario() {
  const destino = String(process.env.BACKUP_EMAIL || '').trim();
  if (!destino) return;
  const horaCfg = Number(process.env.BACKUP_HORA ?? 3);
  const hora = Number.isInteger(horaCfg) && horaCfg >= 0 && horaCfg <= 23 ? horaCfg : 3;
  let ultimoDia = null;

  const revisar = async () => {
    const [dia, hhmmss] = ahoraArgentina().split(' ');
    if (Number(hhmmss.slice(0, 2)) !== hora || ultimoDia === dia) return;
    ultimoDia = dia;
    try {
      const { queryOne } = getDb();
      const total = queryOne('SELECT COUNT(*) as n FROM inscripciones')?.n || 0;
      const r = await enviarEmailBackup({ destino, archivo: exportDatabase(), nombre: nombreBackup(), totalFichas: total });
      console.log(r.ok ? '💾 Backup diario enviado por mail' : '⚠️  Backup diario no enviado: SMTP sin configurar');
    } catch (err) {
      console.error('No se pudo mandar el backup diario:', err.message);
    }
  };

  setInterval(revisar, 10 * 60 * 1000).unref();
  console.log(`💾 Backup diario por mail activado (${hora}:00 hs)`);
}

// Serve frontend in production (for Railway deployment)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDistPath, 'index.html'), err => {
    if (err) res.status(200).send('API Colonias de Verano Valle Viejo funcionando.');
  });
});

initDatabase().then(() => {
  programarBackupDiario();
  app.listen(PORT, () => {
    console.log(`✅ Servidor Colonias de Verano corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error al inicializar BD:', err);
});
