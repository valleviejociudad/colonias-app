import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Send,
  FileText,
  Phone,
  Lock
} from 'lucide-react';
import HeaderValleViejo from '../../components/ui/HeaderValleViejo';
import AlertaClimaticaBanner from '../../components/ui/AlertaClimaticaBanner';
import FichaMedicaVerticalView from '../../components/ficha/FichaMedicaVerticalView';

const PATOLOGIAS_FORM = [
  { key: 'alergias', label: 'Alergias (medicamentos, insectos, alimentos, polen)' },
  { key: 'cardiacas', label: 'Cardíacas (soplos, arritmias, hipertensión)' },
  { key: 'rinones', label: 'Riñones (infecciones urinarias, patologías renales)' },
  { key: 'oncologicas', label: 'Oncológicas' },
  { key: 'tiroides', label: 'Tiroides (hipotiroidismo / hipertiroidismo)' },
  { key: 'asmas', label: 'Asmas / Broncoespasmo (uso de inhalador)' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'neurologicas', label: 'Neurológicas (convulsiones, epilepsia)' },
  { key: 'oftalmologicas', label: 'Oftalmológicas (usa lentes, disminución visual)' },
  { key: 'auditivas', label: 'Auditivas (hipoacusia, otitis frecuente)' },
  { key: 'celiaquia', label: 'Celiaquía (requiere dieta Sin TACC)' },
  { key: 'discapacidad', label: 'Discapacidad (motriz, intelectual, sensorial, CUD)' },
  { key: 'otras', label: 'Otras patologías o medicación habitual' }
];

export default function FormularioInscripcionPage() {
  const [colonias, setColonias] = useState([]);
  const [coloniaId, setColoniaId] = useState('');
  const [autorizado, setAutorizado] = useState(true);

  const [padre, setPadre] = useState({
    apellido_nombre: '',
    parentesco: 'Madre',
    dni: '',
    telefono: '',
    whatsapp: '',
    email: '',
    contacto_urgencia: ''
  });

  const [nino, setNino] = useState({
    dni: '',
    apellido_nombre: '',
    fecha_nacimiento: '',
    edad: '',
    domicilio: '',
    tiene_obra_social: false,
    obra_social_nombre: '',
    esquema_vacunacion: 'Completo según Calendario Nacional',
    telefono_nino: '',
    presion_alta: '',
    presion_baja: '',
    peso: '',
    talla: '',
    imc: '',
    circunferencia_cintura: ''
  });

  const [medica, setMedica] = useState({
    recibe_atencion_medica: false,
    atencion_medica_detalle: '',
    alergias_si: false, alergias_cual: '',
    cardiacas_si: false, cardiacas_cual: '',
    rinones_si: false, rinones_cual: '',
    oncologicas_si: false, oncologicas_cual: '',
    tiroides_si: false, tiroides_cual: '',
    asmas_si: false, asmas_cual: '',
    diabetes_si: false, diabetes_cual: '',
    neurologicas_si: false, neurologicas_cual: '',
    oftalmologicas_si: false, oftalmologicas_cual: '',
    auditivas_si: false, auditivas_cual: '',
    celiaquia_si: false, celiaquia_cual: '',
    discapacidad_si: false, discapacidad_cual: '',
    otras_si: false, otras_cual: '',
    antecedentes_personales: '',
    observaciones: '',
    firma_profesional_texto: ''
  });

  const [firmaPadre, setFirmaPadre] = useState('');

  // Duplicate DNI state
  const [verificandoDni, setVerificandoDni] = useState(false);
  const [dniExistente, setDniExistente] = useState(null);
  const [fichaExistenteModal, setFichaExistenteModal] = useState(null);

  // Submission state
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fichaCreada, setFichaCreada] = useState(null);

  useEffect(() => {
    fetch('/api/colonias')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const activas = data.filter((c) => c.activa === 1);
          setColonias(activas);
          if (activas.length > 0) setColoniaId(String(activas[0].id));
        }
      })
      .catch(() => {});
  }, []);

  // Real-time DNI check when parent enters child's DNI
  useEffect(() => {
    const clean = String(nino.dni || '').replace(/\D/g, '');
    if (clean.length < 7) {
      setDniExistente(null);
      return;
    }

    const timer = setTimeout(() => {
      setVerificandoDni(true);
      fetch(`/api/inscripciones/verificar-dni/${clean}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.existe) {
            setDniExistente(data.datos);
          } else {
            setDniExistente(null);
          }
        })
        .catch(() => {})
        .finally(() => setVerificandoDni(false));
    }, 320);

    return () => clearTimeout(timer);
  }, [nino.dni]);

  // Auto-calculate age from birth date
  const handleFechaNacimientoChange = (val) => {
    let edadCalc = nino.edad;
    if (val) {
      const birth = new Date(val);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age >= 0 && age < 100) {
        edadCalc = String(age);
      }
    }
    setNino((prev) => ({ ...prev, fecha_nacimiento: val, edad: edadCalc }));
  };

  // Auto-calculate IMC from Peso (kg) and Talla (cm)
  useEffect(() => {
    const pesoNum = parseFloat(nino.peso);
    const tallaCm = parseFloat(nino.talla);
    if (pesoNum > 0 && tallaCm > 30) {
      const tallaM = tallaCm > 3 ? tallaCm / 100 : tallaCm;
      const imcVal = (pesoNum / (tallaM * tallaM)).toFixed(1);
      setNino((prev) => ({ ...prev, imc: imcVal }));
    }
  }, [nino.peso, nino.talla]);

  const handleVerFichaExistente = async (id) => {
    try {
      const res = await fetch(`/api/inscripciones/${id}`);
      const data = await res.json();
      if (res.ok) {
        setFichaExistenteModal(data);
      }
    } catch (e) {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (dniExistente) {
      setErrorMsg(
        `El niño/a con DNI ${nino.dni} ya se encuentra inscripto en ${dniExistente.colonia_nombre} (Ficha ${dniExistente.nro_ficha}).`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        colonia_id: Number(coloniaId),
        autorizado,
        firma_padre_texto: firmaPadre || padre.apellido_nombre,
        padre: {
          ...padre,
          whatsapp: padre.whatsapp || padre.telefono
        },
        nino: {
          ...nino,
          presion_arterial:
            nino.presion_alta && nino.presion_baja
              ? `${nino.presion_alta}/${nino.presion_baja}`
              : ''
        },
        medica
      };

      const res = await fetch('/api/inscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Ocurrió un error al registrar la ficha.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setFichaCreada(data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setErrorMsg('Error de conexión con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  // If viewing an existing or newly created record
  if (fichaCreada) {
    return (
      <div className="gf-page-wrapper">
        <div className="gf-container" style={{ maxWidth: '1160px' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gf-card no-print"
            style={{
              background: 'linear-gradient(135deg, #006c4c 0%, #0082a8 100%)',
              color: '#ffffff',
              textAlign: 'center',
              padding: '28px 24px'
            }}
          >
            <CheckCircle2 size={48} style={{ margin: '0 auto 10px' }} />
            <h2 className="font-display" style={{ fontSize: '1.65rem', fontWeight: 800 }}>
              ¡Inscripción y Ficha Médica Registrada con Éxito!
            </h2>
            <p style={{ opacity: 0.95, marginTop: '6px', fontSize: '1rem' }}>
              El niño/a <strong>{fichaCreada.nino?.apellido_nombre}</strong> quedó inscripto en{' '}
              <strong>{fichaCreada.colonia_nombre}</strong> con el Nº de Ficha Oficial{' '}
              <span
                style={{
                  background: '#ffffff',
                  color: '#006494',
                  padding: '3px 12px',
                  borderRadius: '999px',
                  fontWeight: 800
                }}
              >
                {fichaCreada.nro_ficha}
              </span>
            </p>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="md3-btn"
                style={{ background: '#ffffff', color: '#006494' }}
                onClick={() => window.location.reload()}
              >
                Inscribir a otro niño/a (hermano/a)
              </button>
            </div>
          </motion.div>

          <FichaMedicaVerticalView ficha={fichaCreada} showBackButton={false} hideAdminToolbar={true} />
        </div>
      </div>
    );
  }

  if (fichaExistenteModal) {
    return (
      <div className="gf-page-wrapper">
        <div className="gf-container" style={{ maxWidth: '1160px' }}>
          <FichaMedicaVerticalView
            ficha={fichaExistenteModal}
            onBack={() => setFichaExistenteModal(null)}
            hideAdminToolbar={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="gf-page-wrapper">
      <div className="gf-container">
        {/* Top Admin Shortcut Bar */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 4px 8px'
          }}
        >
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#006494' }}>
            🏛️Formulario Oficial Público • No requiere cuenta ni descarga
          </span>
          <Link
            to="/admin"
            className="md3-btn md3-btn-tonal"
            style={{ padding: '7px 14px', fontSize: '0.8rem' }}
          >
            <Lock size={14} /> Acceso Coordinadores / Admin
          </Link>
        </div>

        {/* Weather / Suspension Alert Banner */}
        <AlertaClimaticaBanner />

        {/* HEADER CARD (Google Forms Style) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.05, 0.7, 0.1, 1] }}
          className="gf-card"
          style={{ paddingTop: '28px' }}
        >
          <div className="gf-card-header-bar" />
          <HeaderValleViejo showTemporada={true} />

          <div
            style={{
              marginTop: '14px',
              background: '#f0f9ff',
              borderLeft: '4px solid #0284c7',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: '#0c4a6e'
            }}
          >
            <strong>Sres. Padres y/o Tutores:</strong> A continuación les solicitamos que completen la
            autorización y la planilla de control de salud integral de su hijo/a para las{' '}
            <strong>Colonias de Verano de la Municipalidad de Valle Viejo</strong>. Es muy sencillo y
            sus datos quedan disponibles de inmediato ante cualquier urgencia médica.
          </div>

          <p style={{ marginTop: '10px', fontSize: '0.82rem', color: '#ba1a1a', fontWeight: 600 }}>
            * Indica que la pregunta es obligatoria
          </p>
        </motion.div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#ffdad6',
              border: '1.5px solid #ba1a1a',
              color: '#410002',
              padding: '14px 18px',
              borderRadius: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <AlertCircle size={22} color="#ba1a1a" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* PASO 1: DNI DEL NIÑO (Verificación instantánea) y SEDE DE LA COLONIA */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="gf-card"
          >
            <div className="gf-card-section-bar">
              <MapPin size={15} /> 1. Verificación por DNI y Selección de Localidad
            </div>

            <div className="md3-field">
              <label className="md3-label">
                D.N.I. del Niño/a o Adolescente (sin puntos) <span className="md3-required">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="md3-input"
                placeholder="Ej: 54123890 (Pruebe 54123890 para ver el detector de inscriptos)"
                value={nino.dni}
                onChange={(e) => setNino({ ...nino, dni: e.target.value.replace(/\D/g, '') })}
                required
              />
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Al escribir el DNI verificamos automáticamente si su hijo/a ya fue inscripto.
              </span>
            </div>

            {/* Real-time Duplicate DNI Alert */}
            <AnimatePresence>
              {verificandoDni && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ fontSize: '0.85rem', color: '#006494', fontWeight: 600, marginBottom: '10px' }}
                >
                  ⏳ Verificando DNI en el padrón de Colonias de Verano...
                </motion.div>
              )}

              {dniExistente && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: '#fff3cd',
                    border: '2px solid #f59e0b',
                    borderRadius: '14px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertCircle size={26} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: '#78350f', fontSize: '1.02rem', fontWeight: 800 }}>
                        ¡Atención! Este niño/a ya se encuentra inscripto
                      </h4>
                      <p style={{ color: '#451a03', fontSize: '0.9rem', marginTop: '4px' }}>
                        <strong>{dniExistente.nino_nombre}</strong> (DNI {dniExistente.dni}) ya tiene su ficha médica
                        cargada en <strong>{dniExistente.colonia_nombre}</strong> ({dniExistente.colonia_turno}).
                      </p>
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '0.84rem',
                          color: '#78350f',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '12px'
                        }}
                      >
                        <span>
                          <strong>Nº de Ficha:</strong> {dniExistente.nro_ficha}
                        </span>
                        <span>
                          <strong>Inscripto por:</strong> {dniExistente.padre_nombre}
                        </span>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <button
                          type="button"
                          className="md3-btn md3-btn-filled"
                          onClick={() => handleVerFichaExistente(dniExistente.inscripcion_id)}
                        >
                          <FileText size={16} /> Ver / Descargar su Ficha Médica
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="md3-field" style={{ marginBottom: 0 }}>
              <label className="md3-label">
                ¿En qué Colonia / Localidad de Valle Viejo desea inscribirlo? <span className="md3-required">*</span>
              </label>
              <div style={{ display: 'grid', gap: '10px', marginTop: '6px' }}>
                {colonias.map((col) => {
                  const selected = String(col.id) === String(coloniaId);
                  return (
                    <label
                      key={col.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px 16px',
                        borderRadius: '14px',
                        border: selected ? '2px solid #006494' : '1.5px solid #cbd5e1',
                        background: selected ? '#f0f9ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input
                        type="radio"
                        name="colonia_sede"
                        value={col.id}
                        checked={selected}
                        onChange={() => setColoniaId(String(col.id))}
                        style={{ marginTop: '4px', transform: 'scale(1.25)', accentColor: '#006494' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                          <strong style={{ color: '#0f172a', fontSize: '0.98rem' }}>{col.nombre}</strong>
                          <span
                            style={{
                              fontSize: '0.76rem',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              padding: '2px 10px',
                              borderRadius: '999px',
                              fontWeight: 700
                            }}
                          >
                            {col.turno}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '2px' }}>
                          📍 {col.sede} — {col.direccion}
                        </div>
                        {col.suspendida === 1 && (
                          <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 700, marginTop: '4px' }}>
                            ⚠️ Localidad con aviso climático activo: {col.motivo_suspension}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* PASO 2: AUTORIZACIÓN Y DATOS DEL PADRE / MADRE / TUTOR */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="gf-card"
          >
            <div className="gf-card-section-bar">
              <UserCheck size={15} /> 2. Autorización y Datos del Padre, Madre o Tutor
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                marginBottom: '18px'
              }}
            >
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                Autorizo al equipo de Salud de la Municipalidad de Valle Viejo a realizarle a mi hijo/a un control de niño sano: <span className="md3-required">*</span>
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '999px',
                    background: autorizado ? '#cbe6ff' : '#fff',
                    border: autorizado ? '2px solid #006494' : '1px solid #cbd5e1',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    checked={autorizado === true}
                    onChange={() => setAutorizado(true)}
                    style={{ accentColor: '#006494' }}
                  />
                  SÍ, AUTORIZO
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '999px',
                    background: !autorizado ? '#ffdad6' : '#fff',
                    border: !autorizado ? '2px solid #ba1a1a' : '1px solid #cbd5e1',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    checked={autorizado === false}
                    onChange={() => setAutorizado(false)}
                    style={{ accentColor: '#ba1a1a' }}
                  />
                  NO
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 16px' }}>
              <div className="md3-field" style={{ gridColumn: '1 / -1' }}>
                <label className="md3-label">
                  Apellido y nombre del padre / madre o tutor <span className="md3-required">*</span>
                </label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Bazán, María Elena"
                  value={padre.apellido_nombre}
                  onChange={(e) => {
                    setPadre({ ...padre, apellido_nombre: e.target.value });
                    if (!firmaPadre) setFirmaPadre(e.target.value);
                  }}
                  required
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">
                  D.N.I. del Padre/Tutor <span className="md3-required">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="md3-input"
                  placeholder="Ej: 31456789"
                  value={padre.dni}
                  onChange={(e) => setPadre({ ...padre, dni: e.target.value.replace(/\D/g, '') })}
                  required
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">
                  Parentesco <span className="md3-required">*</span>
                </label>
                <select
                  className="md3-select"
                  value={padre.parentesco}
                  onChange={(e) => setPadre({ ...padre, parentesco: e.target.value })}
                >
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Tutor/a Legal">Tutor/a Legal</option>
                  <option value="Abuelo/a">Abuelo/a</option>
                  <option value="Tío/a">Tío/a</option>
                </select>
              </div>

              <div className="md3-field">
                <label className="md3-label">
                  Teléfono / WhatsApp del Padre/Tutor <span className="md3-required">*</span>
                </label>
                <input
                  type="tel"
                  className="md3-input"
                  placeholder="Ej: 3834512345 (Sin 0 ni 15)"
                  value={padre.telefono}
                  onChange={(e) =>
                    setPadre({ ...padre, telefono: e.target.value, whatsapp: e.target.value })
                  }
                  required
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Recibirá avisos importantes o alertas por suspensión climática.
                </span>
              </div>

              <div className="md3-field">
                <label className="md3-label">
                  Correo electrónico (Email) <span className="md3-required">*</span>
                </label>
                <input
                  type="email"
                  className="md3-input"
                  placeholder="ejemplo@correo.com"
                  value={padre.email}
                  onChange={(e) => setPadre({ ...padre, email: e.target.value })}
                  required
                />
              </div>

              <div className="md3-field" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="md3-label" style={{ color: '#b91c1c', fontWeight: 700 }}>
                  <Phone size={15} /> Contacto de urgencia (Nombre y Teléfono alternativo) <span className="md3-required">*</span>
                </label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Carlos Gómez (Padre) - 3834598765"
                  value={padre.contacto_urgencia}
                  onChange={(e) => setPadre({ ...padre, contacto_urgencia: e.target.value })}
                  required
                />
              </div>
            </div>
          </motion.div>

          {/* PASO 3: DATOS DEL NIÑO/A Y CONTROL DE SALUD */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="gf-card"
          >
            <div className="gf-card-section-bar">
              <HeartPulse size={15} /> 3. Datos del Niño/a o Adolescente y Control Clínico
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0 16px' }}>
              <div className="md3-field" style={{ gridColumn: '1 / -1' }}>
                <label className="md3-label">
                  Apellido y nombre del niño/a <span className="md3-required">*</span>
                </label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Gómez Bazán, Mateo Benjamín"
                  value={nino.apellido_nombre}
                  onChange={(e) => setNino({ ...nino, apellido_nombre: e.target.value })}
                  required
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">
                  Fecha de nacimiento <span className="md3-required">*</span>
                </label>
                <input
                  type="date"
                  className="md3-input"
                  value={nino.fecha_nacimiento}
                  onChange={(e) => handleFechaNacimientoChange(e.target.value)}
                  required
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">
                  Edad (años) <span className="md3-required">*</span>
                </label>
                <input
                  type="number"
                  min="3"
                  max="18"
                  className="md3-input"
                  placeholder="Ej: 9"
                  value={nino.edad}
                  onChange={(e) => setNino({ ...nino, edad: e.target.value })}
                  required
                />
              </div>

              <div className="md3-field" style={{ gridColumn: '1 / -1' }}>
                <label className="md3-label">
                  Domicilio completo (Barrio, Calle, Localidad) <span className="md3-required">*</span>
                </label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Bº 140 Viviendas Casa 24, San Isidro, Valle Viejo"
                  value={nino.domicilio}
                  onChange={(e) => setNino({ ...nino, domicilio: e.target.value })}
                  required
                />
              </div>

              {/* Obra Social */}
              <div className="md3-field">
                <label className="md3-label">¿Posee Obra Social?</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className={`md3-chip ${nino.tiene_obra_social ? 'active' : ''}`}
                    onClick={() => setNino({ ...nino, tiene_obra_social: true })}
                  >
                    SÍ posee
                  </button>
                  <button
                    type="button"
                    className={`md3-chip ${!nino.tiene_obra_social ? 'active' : ''}`}
                    onClick={() => setNino({ ...nino, tiene_obra_social: false, obra_social_nombre: '' })}
                  >
                    NO posee
                  </button>
                </div>
              </div>

              {nino.tiene_obra_social && (
                <div className="md3-field">
                  <label className="md3-label">¿Cuál Obra Social?</label>
                  <input
                    type="text"
                    className="md3-input"
                    placeholder="Ej: OSEP Catamarca / Swiss Medical"
                    value={nino.obra_social_nombre}
                    onChange={(e) => setNino({ ...nino, obra_social_nombre: e.target.value })}
                  />
                </div>
              )}

              <div className="md3-field" style={{ gridColumn: '1 / -1' }}>
                <label className="md3-label">Esquema de Vacunación</label>
                <select
                  className="md3-select"
                  value={nino.esquema_vacunacion}
                  onChange={(e) => setNino({ ...nino, esquema_vacunacion: e.target.value })}
                >
                  <option value="Completo según Calendario Nacional">Completo según Calendario Nacional</option>
                  <option value="En curso / Pendiente refuerzo">En curso / Pendiente refuerzo</option>
                  <option value="Incompleto">Incompleto</option>
                </select>
              </div>

              {/* Mediciones Clínicas (Peso, Talla, IMC, Presión, Cintura) */}
              <div className="md3-field">
                <label className="md3-label">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="md3-input"
                  placeholder="Ej: 31.5"
                  value={nino.peso}
                  onChange={(e) => setNino({ ...nino, peso: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">Talla / Altura (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  className="md3-input"
                  placeholder="Ej: 134"
                  value={nino.talla}
                  onChange={(e) => setNino({ ...nino, talla: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">IMC (Automático)</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Calculado..."
                  value={nino.imc}
                  onChange={(e) => setNino({ ...nino, imc: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">Presión Arterial Alta (Sistólica)</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: 100"
                  value={nino.presion_alta}
                  onChange={(e) => setNino({ ...nino, presion_alta: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">Presión Arterial Baja (Diastólica)</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: 65"
                  value={nino.presion_baja}
                  onChange={(e) => setNino({ ...nino, presion_baja: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">Circunferencia de cintura (cm)</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: 58"
                  value={nino.circunferencia_cintura}
                  onChange={(e) => setNino({ ...nino, circunferencia_cintura: e.target.value })}
                />
              </div>

              <div className="md3-field" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label className="md3-label">Antecedentes personales de salud (cirugías, internaciones, etc.)</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Sin antecedentes relevantes / Operado de apendicitis en 2023"
                  value={medica.antecedentes_personales}
                  onChange={(e) => setMedica({ ...medica, antecedentes_personales: e.target.value })}
                />
              </div>
            </div>
          </motion.div>

          {/* PASO 4: PATOLOGÍAS (Idéntico a la planilla de Valle Viejo pero interactivo estilo Google Forms) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="gf-card"
          >
            <div className="gf-card-section-bar">
              <ShieldCheck size={15} /> 4. ¿Padece alguna de estas patologías?
            </div>

            <div className="md3-field">
              <label className="md3-label">¿Recibe atención o tratamiento médico actualmente?</label>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`md3-chip ${medica.recibe_atencion_medica ? 'active' : ''}`}
                  onClick={() => setMedica({ ...medica, recibe_atencion_medica: true })}
                >
                  SÍ
                </button>
                <button
                  type="button"
                  className={`md3-chip ${!medica.recibe_atencion_medica ? 'active' : ''}`}
                  onClick={() =>
                    setMedica({ ...medica, recibe_atencion_medica: false, atencion_medica_detalle: '' })
                  }
                >
                  NO
                </button>
                {medica.recibe_atencion_medica && (
                  <input
                    type="text"
                    className="md3-input"
                    style={{ flex: 1, minWidth: '220px' }}
                    placeholder="¿Por qué motivo o con qué especialista?"
                    value={medica.atencion_medica_detalle}
                    onChange={(e) => setMedica({ ...medica, atencion_medica_detalle: e.target.value })}
                  />
                )}
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '12px' }}>
              Marque <strong>SÍ</strong> o <strong>NO</strong> en cada fila. Si marca <strong>SÍ</strong>, especifique cuál para que los médicos y coordinadores lo sepan ante una urgencia:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {PATOLOGIAS_FORM.map((pat) => {
                const isSi = Boolean(medica[`${pat.key}_si`]);
                return (
                  <div
                    key={pat.key}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSi ? '1.5px solid #e11d48' : '1px solid #e2e8f0',
                      background: isSi ? '#fff1f2' : '#f8fafc',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a' }}>
                        {pat.label}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setMedica({ ...medica, [`${pat.key}_si`]: true })}
                          style={{
                            padding: '6px 16px',
                            borderRadius: '999px',
                            border: isSi ? '2px solid #be123c' : '1px solid #cbd5e1',
                            background: isSi ? '#be123c' : '#ffffff',
                            color: isSi ? '#ffffff' : '#334155',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          SÍ
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMedica({
                              ...medica,
                              [`${pat.key}_si`]: false,
                              [`${pat.key}_cual`]: ''
                            })
                          }
                          style={{
                            padding: '6px 16px',
                            borderRadius: '999px',
                            border: !isSi ? '2px solid #006494' : '1px solid #cbd5e1',
                            background: !isSi ? '#cbe6ff' : '#ffffff',
                            color: !isSi ? '#001e30' : '#334155',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          NO
                        </button>
                      </div>
                    </div>

                    {isSi && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ marginTop: '10px' }}
                      >
                        <input
                          type="text"
                          className="md3-input"
                          style={{ background: '#ffffff', borderColor: '#f43f5e' }}
                          placeholder="¿Cuál? Especifique detalle, medicación o cuidados de urgencia..."
                          value={medica[`${pat.key}_cual`]}
                          onChange={(e) =>
                            setMedica({ ...medica, [`${pat.key}_cual`]: e.target.value })
                          }
                          required={isSi}
                        />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* PASO 5: OBSERVACIONES Y FIRMA DIGITAL */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="gf-card"
          >
            <div className="gf-card-section-bar">
              <Sparkles size={15} /> 5. Observaciones Finales y Firma
            </div>

            <div className="md3-field">
              <label className="md3-label">
                Observaciones adicionales (Cuidados especiales, indicaciones para pileta o profesores)
              </label>
              <textarea
                rows="3"
                className="md3-textarea"
                placeholder="Escriba aquí cualquier indicación importante para los coordinadores y médicos..."
                value={medica.observaciones}
                onChange={(e) => setMedica({ ...medica, observaciones: e.target.value })}
              />
            </div>

            <div className="md3-field">
              <label className="md3-label">
                Firma Digital del Padre / Madre o Tutor (Escriba su Nombre Completo en conformidad) <span className="md3-required">*</span>
              </label>
              <input
                type="text"
                className="md3-input"
                placeholder="Nombre y Apellido del Padre/Tutor"
                value={firmaPadre}
                onChange={(e) => setFirmaPadre(e.target.value)}
                required
              />
            </div>

            <p
              style={{
                fontSize: '0.8rem',
                color: '#475569',
                background: '#f8fafc',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px dashed #cbd5e1',
                marginBottom: '18px'
              }}
            >
              Es necesario aclarar y notificar a los Sres. Padres y/o Tutores que la Municipalidad de Valle Viejo,
              así como los distintos grupos de trabajo conformados para llevar a cabo las actividades de la colonia
              de verano 2025, no se hacen responsables de la pérdida de: vestimenta, dinero, dispositivos electrónicos,
              celulares y otros objetos que su hijo/a llegara a extraviar.
            </p>

            <button
              type="submit"
              className="md3-btn md3-btn-filled"
              style={{ width: '100%', padding: '15px', fontSize: '1.05rem' }}
              disabled={enviando || Boolean(dniExistente)}
            >
              <Send size={20} />
              {enviando ? 'Registrando Ficha Médica Digital...' : 'Enviar Inscripción y Generar Ficha Médica'}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
