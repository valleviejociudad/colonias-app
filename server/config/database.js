const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'colonias.sqlite');

let dbInstance = null;

function saveDatabase() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Escritura atómica: escribe en temporal y renombra, evita corrupción si el proceso se corta
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, DB_PATH);
}

// Ejecuta fn dentro de una transacción SQLite. Si lanza, hace ROLLBACK y re-lanza.
function transaction(fn) {
  dbInstance.run('BEGIN');
  try {
    const result = fn();
    dbInstance.run('COMMIT');
    saveDatabase();
    return result;
  } catch (err) {
    try { dbInstance.run('ROLLBACK'); } catch (_) {}
    throw err;
  }
}

// Helper methods to query sql.js cleanly
function queryAll(sql, params = []) {
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runQuery(sql, params = []) {
  dbInstance.run(sql, params);
  const res = queryOne('SELECT last_insert_rowid() as id');
  // saveDatabase() se llama desde transaction() o explícitamente. No guardar en cada runQuery
  // para evitar escrituras repetidas; los callers que no usan transaction llaman saveDatabase() ellos.
  return { lastInsertRowid: res ? res.id : null };
}

function runQueryAndSave(sql, params = []) {
  const result = runQuery(sql, params);
  saveDatabase();
  return result;
}

async function initDatabase() {
  if (dbInstance) return { queryAll, queryOne, runQuery, saveDatabase };

  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Claves foráneas y WAL para mejor rendimiento y consistencia
  dbInstance.run('PRAGMA foreign_keys = ON');
  dbInstance.run('PRAGMA journal_mode = MEMORY');

  // Create tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT,
      rol TEXT DEFAULT 'admin',
      avatar TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS colonias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      sede TEXT NOT NULL,
      direccion TEXT NOT NULL,
      descripcion TEXT,
      turno TEXT DEFAULT 'Mañana (08:30 a 12:30 hs)',
      edades TEXT DEFAULT '5 a 13 años',
      coordinador_responsable TEXT,
      telefono_sede TEXT,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      activa INTEGER DEFAULT 1,
      suspendida INTEGER DEFAULT 0,
      motivo_suspension TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS inscripciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colonia_id INTEGER NOT NULL,
      nro_ficha TEXT NOT NULL,
      token_publico TEXT,
      fecha_inscripcion TEXT DEFAULT (datetime('now', 'localtime')),
      autorizado INTEGER DEFAULT 1,
      estado TEXT DEFAULT 'activo',
      firma_padre_texto TEXT,
      firma_profesional_texto TEXT,
      FOREIGN KEY (colonia_id) REFERENCES colonias(id)
    );

    CREATE TABLE IF NOT EXISTS datos_padre (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion_id INTEGER NOT NULL UNIQUE,
      apellido_nombre TEXT NOT NULL,
      parentesco TEXT NOT NULL,
      dni TEXT NOT NULL,
      telefono TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      email TEXT NOT NULL,
      contacto_urgencia TEXT NOT NULL,
      FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS datos_nino (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion_id INTEGER NOT NULL UNIQUE,
      apellido_nombre TEXT NOT NULL,
      dni TEXT NOT NULL UNIQUE,
      fecha_nacimiento TEXT NOT NULL,
      edad INTEGER NOT NULL,
      domicilio TEXT NOT NULL,
      tiene_obra_social INTEGER DEFAULT 0,
      obra_social_nombre TEXT,
      esquema_vacunacion TEXT DEFAULT 'Completo',
      telefono_nino TEXT,
      presion_arterial TEXT,
      presion_alta TEXT,
      presion_baja TEXT,
      peso TEXT,
      talla TEXT,
      imc TEXT,
      circunferencia_cintura TEXT,
      FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ficha_medica (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inscripcion_id INTEGER NOT NULL UNIQUE,
      recibe_atencion_medica INTEGER DEFAULT 0,
      atencion_medica_detalle TEXT,
      alergias_si INTEGER DEFAULT 0,
      alergias_cual TEXT,
      cardiacas_si INTEGER DEFAULT 0,
      cardiacas_cual TEXT,
      rinones_si INTEGER DEFAULT 0,
      rinones_cual TEXT,
      oncologicas_si INTEGER DEFAULT 0,
      oncologicas_cual TEXT,
      tiroides_si INTEGER DEFAULT 0,
      tiroides_cual TEXT,
      asmas_si INTEGER DEFAULT 0,
      asmas_cual TEXT,
      diabetes_si INTEGER DEFAULT 0,
      diabetes_cual TEXT,
      neurologicas_si INTEGER DEFAULT 0,
      neurologicas_cual TEXT,
      oftalmologicas_si INTEGER DEFAULT 0,
      oftalmologicas_cual TEXT,
      auditivas_si INTEGER DEFAULT 0,
      auditivas_cual TEXT,
      celiaquia_si INTEGER DEFAULT 0,
      celiaquia_cual TEXT,
      discapacidad_si INTEGER DEFAULT 0,
      discapacidad_cual TEXT,
      otras_si INTEGER DEFAULT 0,
      otras_cual TEXT,
      antecedentes_personales TEXT,
      observaciones TEXT,
      FOREIGN KEY (inscripcion_id) REFERENCES inscripciones(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alertas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colonia_id INTEGER,
      tipo TEXT DEFAULT 'suspension',
      titulo TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      activa INTEGER DEFAULT 1,
      enviada_email INTEGER DEFAULT 0,
      enviada_whatsapp INTEGER DEFAULT 0,
      destinatarios_count INTEGER DEFAULT 0,
      creado_por TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (colonia_id) REFERENCES colonias(id)
    );

    CREATE TABLE IF NOT EXISTS albumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      colonia_id INTEGER,
      creado_por INTEGER,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (colonia_id) REFERENCES colonias(id) ON DELETE SET NULL,
      FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
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
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (album_id) REFERENCES albumes(id) ON DELETE SET NULL,
      FOREIGN KEY (colonia_id) REFERENCES colonias(id) ON DELETE SET NULL,
      FOREIGN KEY (subido_por) REFERENCES usuarios(id) ON DELETE SET NULL
    );
  `);
  saveDatabase();

  // Migración: token secreto de acceso de la familia a su ficha (bases ya existentes)
  const colsInscripciones = queryAll('PRAGMA table_info(inscripciones)').map((c) => c.name);
  if (!colsInscripciones.includes('token_publico')) {
    dbInstance.run('ALTER TABLE inscripciones ADD COLUMN token_publico TEXT');
  }
  dbInstance.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_inscripciones_token ON inscripciones(token_publico)');

  // Usuario administrador inicial
  const IS_PROD = process.env.NODE_ENV === 'production';
  const userCount = queryOne('SELECT COUNT(*) as count FROM usuarios');
  if (!userCount || userCount.count === 0) {
    const adminEmail = String(process.env.ADMIN_EMAIL || '').trim();
    const adminPassword = String(process.env.ADMIN_PASSWORD || '');

    if (adminEmail && adminPassword.length >= 8) {
      runQueryAndSave('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
        ['Administrador', adminEmail, bcrypt.hashSync(adminPassword, 10), 'admin']
      );
      console.log(`✅ Usuario administrador inicial creado: ${adminEmail}`);
    } else if (!IS_PROD) {
      // Solo desarrollo local: usuarios de prueba
      runQueryAndSave('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
        ['Subsecretaría de Deportes (Admin)', 'admin@valleviejo.gob.ar', bcrypt.hashSync('admin123', 10), 'admin']
      );
      runQueryAndSave('INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
        ['Coordinación General Colonias', 'coordinador@valleviejo.gob.ar', bcrypt.hashSync('coord123', 10), 'coordinador']
      );
      console.warn('⚠️  Modo desarrollo: usuarios de prueba creados (admin123 / coord123). No usar en producción.');
    } else {
      console.error('❌ No hay usuarios y faltan ADMIN_EMAIL / ADMIN_PASSWORD (mín. 8 caracteres). Nadie podrá ingresar al panel.');
    }
  }

  // Aviso si quedan contraseñas de prueba conocidas
  for (const u of queryAll('SELECT email, password_hash FROM usuarios')) {
    if (u.password_hash && (bcrypt.compareSync('admin123', u.password_hash) || bcrypt.compareSync('coord123', u.password_hash))) {
      console.warn(`⚠️  El usuario ${u.email} todavía usa una contraseña de prueba conocida. Cambiala.`);
    }
  }

  // Seed default colonias if empty
  const coloniaCount = queryOne('SELECT COUNT(*) as count FROM colonias');
  if (!coloniaCount || coloniaCount.count === 0) {
    const coloniasSeed = [
      [
        'Predio de UTHGRA',
        'Predio Recreativo y Deportivo UTHGRA',
        'Avenida de Circunvalación Dr. Néstor C. Kirchner, Valle Viejo',
        'Sede Principal de las Colonias de Verano de la Municipalidad de Valle Viejo. Actividades recreativas, natación, deportes en equipo y control de salud integral.',
        'Mañana (08:30 a 12:30 hs)',
        '5 a 13 años',
        'Coordinación Subsecretaría de Deportes',
        '3834551234',
        (new Date().getFullYear()).toString() + '-01-06',
        (new Date().getFullYear()).toString() + '-02-21'
      ],
      [
        'SUM de Las Tejas',
        'Salón de Usos Múltiples (SUM) Las Tejas',
        'Localidad de Las Tejas, Valle Viejo',
        'Sede Principal en la localidad de Las Tejas. Actividades deportivas, recreativas, talleres integradores y control de salud integral.',
        'Mañana (08:30 a 12:30 hs)',
        '5 a 13 años',
        'Coordinación Subsecretaría de Deportes',
        '3834667890',
        (new Date().getFullYear()).toString() + '-01-06',
        (new Date().getFullYear()).toString() + '-02-21'
      ]
    ];

    for (const c of coloniasSeed) {
      runQueryAndSave(`INSERT INTO colonias (nombre, sede, direccion, descripcion, turno, edades, coordinador_responsable, telefono_sede, fecha_inicio, fecha_fin)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c
      );
    }

    // Seed sample medical records for immediate testing
    seedSampleInscripciones();
  }

  const sinToken = queryAll('SELECT id FROM inscripciones WHERE token_publico IS NULL OR token_publico = ""');
  for (const row of sinToken) {
    dbInstance.run('UPDATE inscripciones SET token_publico = ? WHERE id = ?', [crypto.randomBytes(24).toString('hex'), row.id]);
    saveDatabase();
  }

  saveDatabase();
  return { queryAll, queryOne, runQuery, saveDatabase };
}

function seedSampleInscripciones() {
  const samples = [
    {
      colonia_id: 1,
      nro_ficha: 'VV-2025-0001',
      autorizado: 1,
      firma_padre_texto: 'María Elena Bazán',
      firma_profesional_texto: 'Dr. Roberto Juárez - MP 1842',
      padre: {
        apellido_nombre: 'Bazán, María Elena',
        parentesco: 'Madre',
        dni: '31456789',
        telefono: '3834512345',
        whatsapp: '5493834512345',
        email: 'maria.bazan@email.com',
        contacto_urgencia: 'Carlos Gómez (Padre) - 3834598765'
      },
      nino: {
        apellido_nombre: 'Gómez Bazán, Mateo Benjamín',
        dni: '54123890',
        fecha_nacimiento: '2016-04-14',
        edad: 9,
        domicilio: 'Bº 140 Viviendas Casa 24, San Isidro, Valle Viejo',
        tiene_obra_social: 1,
        obra_social_nombre: 'OSEP Catamarca',
        esquema_vacunacion: 'Completo según calendario nacional',
        telefono_nino: '3834512345',
        presion_arterial: '100/65',
        presion_alta: '100',
        presion_baja: '65',
        peso: '31.5',
        talla: '134',
        imc: '17.5',
        circunferencia_cintura: '58'
      },
      medica: {
        recibe_atencion_medica: 1,
        atencion_medica_detalle: 'Control pediátrico anual en Hospital de Niños',
        alergias_si: 1,
        alergias_cual: 'Alergia a la picadura de hormiga colorada y amoxicilina (lleva corticoide oral en mochila)',
        asmas_si: 1,
        asmas_cual: 'Broncoespasmo leve estacional (usa Salbutamol inhalador si presenta sibilancias)',
        antecedentes_personales: 'Sin cirugías previas. Apto para actividad física y pileta.',
        observaciones: 'ATENCIÓN URGENCIAS: Alérgico a Amoxicilina. En caso de picadura de insecto avisar de inmediato a la madre.'
      }
    },
    {
      colonia_id: 1,
      nro_ficha: 'VV-2025-0002',
      autorizado: 1,
      firma_padre_texto: 'Jorge Luis Aragón',
      firma_profesional_texto: 'Dra. Valeria Soria - MP 2190',
      padre: {
        apellido_nombre: 'Aragón, Jorge Luis',
        parentesco: 'Padre',
        dni: '29876543',
        telefono: '3834623456',
        whatsapp: '5493834623456',
        email: 'jorge.aragon@email.com',
        contacto_urgencia: 'Silvina Roldán (Tía) - 3834711223'
      },
      nino: {
        apellido_nombre: 'Aragón, Sofía Valentina',
        dni: '56890123',
        fecha_nacimiento: '2018-09-22',
        edad: 7,
        domicilio: 'Av. Pte. Castillo 1420, Villa Dolores, Valle Viejo',
        tiene_obra_social: 1,
        obra_social_nombre: 'Swiss Medical',
        esquema_vacunacion: 'Completo',
        telefono_nino: '3834623456',
        presion_arterial: '95/60',
        presion_alta: '95',
        presion_baja: '60',
        peso: '24.0',
        talla: '121',
        imc: '16.4',
        circunferencia_cintura: '53'
      },
      medica: {
        recibe_atencion_medica: 0,
        atencion_medica_detalle: '',
        celiaquia_si: 1,
        celiaquia_cual: 'Intolerancia al gluten diagnosticada - requiere colación Sin TACC',
        oftalmologicas_si: 1,
        oftalmologicas_cual: 'Astigmatismo leve (usa lentes recetados fuera de la pileta)',
        antecedentes_personales: 'Niña sana. Dieta estricta libre de gluten (Sin TACC).',
        observaciones: 'No compartir galletas ni panificados comunes durante el refrigerio de la colonia.'
      }
    },
    {
      colonia_id: 2,
      nro_ficha: 'VV-2025-0003',
      autorizado: 1,
      firma_padre_texto: 'Romina del Valle Córdoba',
      firma_profesional_texto: 'Dr. Roberto Juárez - MP 1842',
      padre: {
        apellido_nombre: 'Córdoba, Romina del Valle',
        parentesco: 'Madre',
        dni: '34112233',
        telefono: '3834334455',
        whatsapp: '5493834334455',
        email: 'romina.cordoba@email.com',
        contacto_urgencia: 'Abuela Marta Córdoba - 3834998877'
      },
      nino: {
        apellido_nombre: 'Quiroga Córdoba, Thiago Ezequiel',
        dni: '52778899',
        fecha_nacimiento: '2014-11-05',
        edad: 11,
        domicilio: 'Calle Las Toscas s/n, Sumalao, Valle Viejo',
        tiene_obra_social: 0,
        obra_social_nombre: '',
        esquema_vacunacion: 'Completo',
        telefono_nino: '3834334455',
        presion_arterial: '110/70',
        presion_alta: '110',
        presion_baja: '70',
        peso: '42.0',
        talla: '148',
        imc: '19.2',
        circunferencia_cintura: '64'
      },
      medica: {
        recibe_atencion_medica: 0,
        atencion_medica_detalle: '',
        antecedentes_personales: 'Sin patologías declaradas. Control de niño sano normal.',
        observaciones: 'Sabe nadar. Autorizado a todas las actividades deportivas.'
      }
    }
  ];

  for (const s of samples) {
    const ins = runQuery(
      `INSERT INTO inscripciones (colonia_id, nro_ficha, autorizado, firma_padre_texto, firma_profesional_texto)
       VALUES (?, ?, ?, ?, ?)`,
      [s.colonia_id, s.nro_ficha, s.autorizado, s.firma_padre_texto, s.firma_profesional_texto]
    );
    const id = ins.lastInsertRowid;

    runQuery(
      `INSERT INTO datos_padre (inscripcion_id, apellido_nombre, parentesco, dni, telefono, whatsapp, email, contacto_urgencia)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        s.padre.apellido_nombre,
        s.padre.parentesco,
        s.padre.dni,
        s.padre.telefono,
        s.padre.whatsapp,
        s.padre.email,
        s.padre.contacto_urgencia
      ]
    );

    runQuery(
      `INSERT INTO datos_nino (inscripcion_id, apellido_nombre, dni, fecha_nacimiento, edad, domicilio, tiene_obra_social, obra_social_nombre, esquema_vacunacion, telefono_nino, presion_arterial, presion_alta, presion_baja, peso, talla, imc, circunferencia_cintura)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        s.nino.apellido_nombre,
        s.nino.dni,
        s.nino.fecha_nacimiento,
        s.nino.edad,
        s.nino.domicilio,
        s.nino.tiene_obra_social,
        s.nino.obra_social_nombre,
        s.nino.esquema_vacunacion,
        s.nino.telefono_nino,
        s.nino.presion_arterial,
        s.nino.presion_alta,
        s.nino.presion_baja,
        s.nino.peso,
        s.nino.talla,
        s.nino.imc,
        s.nino.circunferencia_cintura
      ]
    );

    runQuery(
      `INSERT INTO ficha_medica (
        inscripcion_id, recibe_atencion_medica, atencion_medica_detalle,
        alergias_si, alergias_cual, asmas_si, asmas_cual,
        oftalmologicas_si, oftalmologicas_cual, celiaquia_si, celiaquia_cual,
        antecedentes_personales, observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        s.medica.recibe_atencion_medica || 0,
        s.medica.atencion_medica_detalle || '',
        s.medica.alergias_si || 0,
        s.medica.alergias_cual || '',
        s.medica.asmas_si || 0,
        s.medica.asmas_cual || '',
        s.medica.oftalmologicas_si || 0,
        s.medica.oftalmologicas_cual || '',
        s.medica.celiaquia_si || 0,
        s.medica.celiaquia_cual || '',
        s.medica.antecedentes_personales || '',
        s.medica.observaciones || ''
      ]
    );
  }
}

module.exports = {
  initDatabase,
  getDb: () => ({ queryAll, queryOne, runQuery, runQueryAndSave, saveDatabase, transaction })
};
