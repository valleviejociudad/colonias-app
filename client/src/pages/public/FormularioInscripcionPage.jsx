import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  Lock,
  Send,
  UserPlus
} from 'lucide-react';
import AlertaClimaticaBanner from '../../components/ui/AlertaClimaticaBanner';
import FichaMedicaVerticalView from '../../components/ficha/FichaMedicaVerticalView';
import LaneRope from '../../components/ui/LaneRope';
import ComunidadWhatsAppCard from '../../components/ui/ComunidadWhatsAppCard';
import { normalizarCelular, MSG_CELULAR } from '../../utils/celular';
import { API_BASE, BASE_PATH, asset } from '../../config';

const PATOLOGIAS_FORM = [
  { key: 'alergias', label: 'Alergias', hint: 'medicamentos, insectos, alimentos, polen' },
  { key: 'cardiacas', label: 'Cardíacas', hint: 'soplos, arritmias, presión alta' },
  { key: 'rinones', label: 'Riñones', hint: 'infecciones urinarias, problemas renales' },
  { key: 'oncologicas', label: 'Oncológicas' },
  { key: 'tiroides', label: 'Tiroides', hint: 'hipotiroidismo / hipertiroidismo' },
  { key: 'asmas', label: 'Asma o broncoespasmo', hint: 'usa inhalador' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'neurologicas', label: 'Neurológicas', hint: 'convulsiones, epilepsia' },
  { key: 'oftalmologicas', label: 'De la vista', hint: 'usa lentes, ve poco' },
  { key: 'auditivas', label: 'Del oído', hint: 'escucha poco, otitis frecuente' },
  { key: 'celiaquia', label: 'Celiaquía', hint: 'necesita comida Sin TACC' },
  { key: 'discapacidad', label: 'Discapacidad', hint: 'motriz, intelectual, sensorial, CUD' },
  { key: 'otras', label: 'Otra enfermedad o medicación diaria' }
];

const SECCIONES = [
  { titulo: 'La colonia', desc: 'Empecemos por el DNI de tu hijo/a y la colonia a la que va a ir.' },
  { titulo: 'Adulto responsable', desc: 'Tus datos, para poder avisarte ante cualquier novedad.' },
  { titulo: 'Datos del niño o niña', desc: 'Copialos tal cual figuran en el DNI.' },
  { titulo: 'Control de salud', desc: 'Si no sabés alguno de estos datos, dejalo en blanco: lo completa el equipo de salud en la colonia.' },
  { titulo: 'Enfermedades', desc: 'Marcá Sí o No en cada fila. Si marcás Sí, contanos cuál, así los profesores y médicos lo saben ante una urgencia.' },
  { titulo: 'Firma y envío', desc: 'Último paso. Revisá y enviá la inscripción.' }
];

const PARENTESCOS = ['Madre', 'Padre', 'Tutor/a legal', 'Abuelo/a', 'Tío/a'];
const VACUNAS = [
  { value: 'Completo según Calendario Nacional', label: 'Completo', sub: 'Tiene todas las vacunas del Calendario Nacional' },
  { value: 'En curso / Pendiente refuerzo', label: 'Le falta algún refuerzo' },
  { value: 'Incompleto', label: 'Incompleto' }
];

const MSG_OBLIGATORIA = 'Esta pregunta es obligatoria';

/* ---------- Piezas reutilizables estilo Google Forms ---------- */

function Pregunta({ field, title, required, help, error, children, htmlFor }) {
  const TitleTag = htmlFor ? 'label' : 'div';
  return (
    <div className={`gf-q ${error ? 'has-error' : ''}`} data-field={field}>
      <TitleTag className="gf-q-title" htmlFor={htmlFor} id={`${field}-title`}>
        {title}
        {required && <span className="req" aria-hidden="true">*</span>}
      </TitleTag>
      {help && <span className="gf-q-help">{help}</span>}
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            className="gf-error"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <AlertCircle size={18} /> {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Opcion({ name, checked, onChange, children, sub, danger, required, type = 'radio' }) {
  return (
    <label className={`gf-option ${danger ? 'danger' : ''}`}>
      <input type={type} name={name} checked={checked} onChange={onChange} required={required} />
      {type === 'radio' ? (
        <span className="dot" />
      ) : (
        <span className="box">
          <Check size={16} strokeWidth={3.5} />
        </span>
      )}
      <span className="opt-main">
        <span>{children}</span>
        {sub && <span className="opt-sub">{sub}</span>}
      </span>
    </label>
  );
}

/* ---------- Página ---------- */

export default function FormularioInscripcionPage() {
  const reduceMotion = useReducedMotion();
  const formRef = useRef(null);
  const sectionRef = useRef(null);

  const [paso, setPaso] = useState(0);
  const [direccion, setDireccion] = useState(1);
  const [maxPaso, setMaxPaso] = useState(0);
  const [errores, setErrores] = useState({});

  const [colonias, setColonias] = useState([]);
  const [coloniasCargando, setColoniasCargando] = useState(true);
  const [coloniaId, setColoniaId] = useState('');
  const [autorizado, setAutorizado] = useState(null);

  const [padre, setPadre] = useState({
    apellido_nombre: '',
    parentesco: '',
    dni: '',
    telefono: '',
    whatsapp: '',
    email: '',
    contacto_urgencia: '',
    acepta_whatsapp: null
  });

  const celular = normalizarCelular(padre.telefono);

  // El celular se valida con la misma regla que el servidor; el error aparece al tocar "Siguiente"
  useEffect(() => {
    const el = document.getElementById('telefono');
    if (el) el.setCustomValidity(!padre.telefono || celular ? '' : MSG_CELULAR);
  }, [padre.telefono, celular, paso]);

  const [nino, setNino] = useState({
    dni: '',
    apellido_nombre: '',
    fecha_nacimiento: '',
    edad: '',
    domicilio: '',
    tiene_obra_social: null,
    obra_social_nombre: '',
    esquema_vacunacion: '',
    telefono_nino: '',
    presion_alta: '',
    presion_baja: '',
    peso: '',
    talla: '',
    imc: '',
    circunferencia_cintura: ''
  });

  const [medica, setMedica] = useState(() => {
    const base = {
      recibe_atencion_medica: null,
      atencion_medica_detalle: '',
      antecedentes_personales: '',
      observaciones: '',
      firma_profesional_texto: ''
    };
    PATOLOGIAS_FORM.forEach((p) => {
      base[`${p.key}_si`] = null;
      base[`${p.key}_cual`] = '';
    });
    return base;
  });

  const [firmaPadre, setFirmaPadre] = useState('');
  const [firmaTocada, setFirmaTocada] = useState(false);
  const [aceptaResponsabilidad, setAceptaResponsabilidad] = useState(false);

  const [verificandoDni, setVerificandoDni] = useState(false);
  const [dniExistente, setDniExistente] = useState(null);

  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fichaCreada, setFichaCreada] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/colonias`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const activas = data.filter((c) => c.activa === 1);
          setColonias(activas);
          if (activas.length === 1) setColoniaId(String(activas[0].id));
        }
      })
      .catch(() => {})
      .finally(() => setColoniasCargando(false));
  }, []);

  // Verificación en tiempo real del DNI del niño/a
  useEffect(() => {
    const clean = String(nino.dni || '').replace(/\D/g, '');
    if (clean.length < 7) {
      setDniExistente(null);
      return;
    }
    const timer = setTimeout(() => {
      setVerificandoDni(true);
      fetch(`${API_BASE}/inscripciones/verificar-dni/${clean}`)
        .then((r) => r.json())
        .then((data) => setDniExistente(data && data.existe ? true : null))
        .catch(() => {})
        .finally(() => setVerificandoDni(false));
    }, 320);
    return () => clearTimeout(timer);
  }, [nino.dni]);

  // Edad automática desde la fecha de nacimiento
  const handleFechaNacimientoChange = (val) => {
    let edadCalc = nino.edad;
    if (val) {
      const birth = new Date(val);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age >= 0 && age < 100) edadCalc = String(age);
    }
    setNino((prev) => ({ ...prev, fecha_nacimiento: val, edad: edadCalc }));
  };

  // IMC automático
  useEffect(() => {
    const pesoNum = parseFloat(nino.peso);
    const tallaCm = parseFloat(nino.talla);
    if (pesoNum > 0 && tallaCm > 30) {
      const tallaM = tallaCm > 3 ? tallaCm / 100 : tallaCm;
      setNino((prev) => ({ ...prev, imc: (pesoNum / (tallaM * tallaM)).toFixed(1) }));
    }
  }, [nino.peso, nino.talla]);

  // La firma se completa sola con el nombre del adulto, hasta que la editen
  useEffect(() => {
    if (!firmaTocada) setFirmaPadre(padre.apellido_nombre);
  }, [padre.apellido_nombre, firmaTocada]);

  const scrollArriba = () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const limpiarError = (field) => {
    setErrores((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleFormInput = (e) => {
    const q = e.target.closest('.gf-q');
    if (q?.dataset.field) limpiarError(q.dataset.field);
  };

  // Valida solo las preguntas de la sección visible
  const validarSeccion = () => {
    const root = sectionRef.current;
    if (!root) return true;
    const nuevos = {};
    let primero = null;
    root.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.checkValidity()) return;
      const q = el.closest('.gf-q');
      const field = q?.dataset.field;
      if (!field || nuevos[field]) return;
      let msg = MSG_OBLIGATORIA;
      if (el.validity.typeMismatch && el.type === 'email') msg = 'Revisá el correo: tiene que ser como nombre@correo.com';
      else if (el.validity.rangeUnderflow || el.validity.rangeOverflow) msg = `Ingresá un número entre ${el.min} y ${el.max}`;
      else if (el.validity.tooShort) msg = `Tiene que tener al menos ${el.minLength} números`;
      else if (el.validity.customError) msg = el.validationMessage;
      nuevos[field] = msg;
      if (!primero) primero = { q, el };
    });

    if (paso === 0 && dniExistente) {
      nuevos.dni_nino = nuevos.dni_nino || 'Este DNI ya está inscripto';
      if (!primero) primero = { q: root.querySelector('[data-field="dni_nino"]') };
    }

    setErrores(nuevos);
    if (primero) {
      primero.q?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      if (primero.el && primero.el.type !== 'radio' && primero.el.type !== 'checkbox') {
        setTimeout(() => primero.el.focus({ preventScroll: true }), 300);
      }
      return false;
    }
    return true;
  };

  const irA = (nuevo) => {
    setDireccion(nuevo > paso ? 1 : -1);
    setPaso(nuevo);
    setMaxPaso((m) => Math.max(m, nuevo));
    setErrorMsg('');
    scrollArriba();
  };

  const siguiente = () => {
    if (!validarSeccion()) return;
    irA(Math.min(paso + 1, SECCIONES.length - 1));
  };

  const anterior = () => {
    setErrores({});
    irA(Math.max(paso - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (paso < SECCIONES.length - 1) {
      siguiente();
      return;
    }
    if (!validarSeccion()) return;
    setErrorMsg('');

    if (dniExistente) {
      setErrorMsg(`El niño/a con DNI ${nino.dni} ya está inscripto.`);
      scrollArriba();
      return;
    }

    setEnviando(true);
    try {
      const medicaPayload = { ...medica, recibe_atencion_medica: medica.recibe_atencion_medica === true };
      PATOLOGIAS_FORM.forEach((p) => {
        medicaPayload[`${p.key}_si`] = medica[`${p.key}_si`] === true;
      });

      const payload = {
        colonia_id: Number(coloniaId),
        autorizado: autorizado === true,
        firma_padre_texto: firmaPadre || padre.apellido_nombre,
        padre: { ...padre, telefono: celular || padre.telefono, whatsapp: celular || padre.telefono },
        nino: {
          ...nino,
          tiene_obra_social: nino.tiene_obra_social === true,
          presion_arterial:
            nino.presion_alta && nino.presion_baja ? `${nino.presion_alta}/${nino.presion_baja}` : ''
        },
        medica: medicaPayload
      };

      const res = await fetch(`${API_BASE}/inscripciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'No pudimos guardar la inscripción. Probá de nuevo en unos minutos.');
      } else {
        setFichaCreada(data);
      }
      scrollArriba();
    } catch (err) {
      setErrorMsg('No hay conexión con el servidor. Revisá tu internet y volvé a tocar "Enviar".');
      scrollArriba();
    } finally {
      setEnviando(false);
    }
  };

  const linkPrivado = fichaCreada?.token_publico
    ? `${window.location.origin}${BASE_PATH}/ficha/${fichaCreada.token_publico}`
    : '';

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkPrivado);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    } catch {
      /* el link queda visible para copiar a mano */
    }
  };

  const total = SECCIONES.length;
  const esUltimo = paso === total - 1;

  /* ---------- Pantalla de éxito ---------- */
  if (fichaCreada) {
    return (
      <div className="gf-page-wrapper">
        <div className="gf-water no-print">
          <WaterLogos />
        </div>
        <div className="gf-container" style={{ maxWidth: '1160px' }}>
          <motion.div
            className="gf-card gf-title-card no-print"
            style={{ maxWidth: 770, width: '100%', margin: '0 auto' }}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.div
                initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.5, bounce: 0.35, delay: 0.15 }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--ok-wash)',
                  color: 'var(--ok)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}
              >
                <CheckCircle2 size={32} />
              </motion.div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 1.9rem)' }}>¡Listo! La inscripción quedó registrada</h1>
            </div>

            <p className="gf-desc" style={{ marginTop: 16 }}>
              <strong>{fichaCreada.nino?.apellido_nombre}</strong> quedó inscripto/a en{' '}
              <strong>{fichaCreada.colonia_nombre}</strong>.
            </p>

            <div
              style={{
                marginTop: 18,
                padding: '16px 18px',
                borderRadius: 'var(--r-md)',
                background: 'var(--pool-wash-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              <span style={{ color: 'var(--ink-2)', fontSize: '1rem' }}>Número de ficha</span>
              <span className="font-display" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--pool-ink)' }}>
                {fichaCreada.nro_ficha}
              </span>
            </div>

            <ComunidadWhatsAppCard style={{ marginTop: 18 }} />

            {linkPrivado && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontWeight: 700 }}>Guardá este link para volver a ver la ficha:</p>
                <p style={{ marginTop: 6, fontSize: '0.95rem', color: 'var(--ink-2)', wordBreak: 'break-all' }}>
                  <a href={linkPrivado}>{linkPrivado}</a>
                </p>
                <button type="button" className="md3-btn md3-btn-tonal" style={{ marginTop: 10 }} onClick={copiarLink}>
                  {linkCopiado ? <Check size={18} /> : <Copy size={18} />}
                  {linkCopiado ? 'Link copiado' : 'Copiar link'}
                </button>
              </div>
            )}

            <div className="lane-divider" style={{ margin: '22px 0 18px' }} />

            <button type="button" className="md3-btn md3-btn-filled md3-btn-big" onClick={() => window.location.reload()}>
              <UserPlus size={20} /> Inscribir a otro hijo/a
            </button>
          </motion.div>

          <FichaMedicaVerticalView ficha={fichaCreada} showBackButton={false} hideAdminToolbar={true} />
        </div>
      </div>
    );
  }

  /* ---------- Formulario ---------- */
  const variants = {
    enter: (dir) => ({ opacity: 0, x: reduceMotion ? 0 : dir * 28 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: reduceMotion ? 0 : dir * -20 })
  };

  return (
    <div className="gf-page-wrapper">
      <div className="gf-water no-print">
        <WaterLogos />
      </div>

      <div className="gf-container">
        {/* Tarjeta de título */}
        <motion.div
          className="gf-card gf-title-card"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        >
          <h1>Inscripción a las Colonias de Verano</h1>
          <p className="gf-desc">
            Completá la autorización y la ficha de salud de tu hijo/a para las Colonias de Verano de la
            Municipalidad de Valle Viejo. Son {total} pasos cortos; te lleva unos 10 minutos.
          </p>
          <div className="gf-required-note">* Indica que la pregunta es obligatoria</div>
        </motion.div>

        <AlertaClimaticaBanner />

        {errorMsg && (
          <div className="notice danger" role="alert">
            <AlertCircle size={22} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} onInput={handleFormInput} onChange={handleFormInput} noValidate>
          <AnimatePresence mode="wait" custom={direccion} initial={false}>
            <motion.div
              key={paso}
              ref={sectionRef}
              custom={direccion}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {/* Cabecera de sección */}
              <div>
                <div className="gf-section-head">
                  <h2>
                    <span className="lane-no">{paso + 1}</span>
                    {SECCIONES[paso].titulo}
                  </h2>
                </div>
                <div className="gf-card gf-section-card">
                  <p className="gf-desc" style={{ marginTop: 0 }}>{SECCIONES[paso].desc}</p>
                </div>
              </div>

              {paso === 0 && (
                <>
                  <Pregunta
                    field="dni_nino"
                    htmlFor="dni_nino"
                    title="DNI del niño o niña"
                    required
                    help="Solo números, sin puntos. Revisamos al instante si ya está inscripto."
                    error={errores.dni_nino}
                  >
                    <input
                      id="dni_nino"
                      className="gf-input short"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Tu respuesta"
                      minLength={7}
                      maxLength={9}
                      value={nino.dni}
                      onChange={(e) => setNino({ ...nino, dni: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                    <AnimatePresence initial={false}>
                      {verificandoDni && (
                        <motion.div
                          key="verif"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: 'var(--ink-2)', fontSize: '0.95rem' }}
                        >
                          <Loader2 size={18} className="spin" /> Revisando el DNI…
                        </motion.div>
                      )}
                      {dniExistente && !verificandoDni && (
                        <motion.div
                          key="existe"
                          className="notice warn"
                          style={{ marginTop: 14 }}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.22 }}
                        >
                          <AlertCircle size={22} />
                          <span>
                            <strong>Este niño/a ya está inscripto.</strong> El DNI {nino.dni} ya tiene una ficha
                            cargada. Si necesitás corregir algo, hablá con la coordinación de la colonia.
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Pregunta>

                  <Pregunta field="colonia" title="¿A qué colonia va a ir?" required error={errores.colonia}>
                    {coloniasCargando ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                        <div className="skeleton" style={{ height: 44 }} />
                        <div className="skeleton" style={{ height: 44 }} />
                      </div>
                    ) : colonias.length === 0 ? (
                      <div className="notice" style={{ marginTop: 14 }}>
                        <Info size={20} />
                        <span>Todavía no hay colonias abiertas para inscribirse. Volvé a intentar más adelante.</span>
                      </div>
                    ) : (
                      <div className="gf-options">
                        {colonias.map((col) => (
                          <Opcion
                            key={col.id}
                            name="colonia_sede"
                            required
                            checked={String(col.id) === String(coloniaId)}
                            onChange={() => setColoniaId(String(col.id))}
                            sub={[col.turno, col.direccion].filter(Boolean).join(' · ')}
                          >
                            {col.nombre}
                            {col.suspendida === 1 && (
                              <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--warn)', fontWeight: 700 }}>
                                Actividades suspendidas por ahora. Igual podés inscribir a tu hijo/a.
                              </span>
                            )}
                          </Opcion>
                        ))}
                      </div>
                    )}
                  </Pregunta>
                </>
              )}

              {paso === 1 && (
                <>
                  <Pregunta
                    field="autorizado"
                    title="¿Autorizás al equipo de Salud de la Municipalidad a hacerle a tu hijo/a un control de niño sano?"
                    required
                    error={errores.autorizado}
                  >
                    <div className="gf-options">
                      <Opcion name="autorizado" required checked={autorizado === true} onChange={() => setAutorizado(true)}>
                        Sí, autorizo
                      </Opcion>
                      <Opcion name="autorizado" required danger checked={autorizado === false} onChange={() => setAutorizado(false)}>
                        No autorizo
                      </Opcion>
                    </div>
                  </Pregunta>

                  <Pregunta field="padre_nombre" htmlFor="padre_nombre" title="Tu apellido y nombre" required error={errores.padre_nombre}>
                    <input
                      id="padre_nombre"
                      className="gf-input"
                      type="text"
                      autoComplete="name"
                      placeholder="Tu respuesta"
                      maxLength={120}
                      value={padre.apellido_nombre}
                      onChange={(e) => setPadre({ ...padre, apellido_nombre: e.target.value })}
                      required
                    />
                  </Pregunta>

                  <Pregunta field="parentesco" title="¿Qué sos del niño o niña?" required error={errores.parentesco}>
                    <div className="gf-options">
                      {PARENTESCOS.map((p) => (
                        <Opcion
                          key={p}
                          name="parentesco"
                          required
                          checked={padre.parentesco === p}
                          onChange={() => setPadre({ ...padre, parentesco: p })}
                        >
                          {p}
                        </Opcion>
                      ))}
                    </div>
                  </Pregunta>

                  <Pregunta field="padre_dni" htmlFor="padre_dni" title="Tu DNI" required help="Solo números, sin puntos." error={errores.padre_dni}>
                    <input
                      id="padre_dni"
                      className="gf-input short"
                      type="text"
                      inputMode="numeric"
                      placeholder="Tu respuesta"
                      minLength={7}
                      maxLength={9}
                      value={padre.dni}
                      onChange={(e) => setPadre({ ...padre, dni: e.target.value.replace(/\D/g, '') })}
                      required
                    />
                  </Pregunta>

                  <Pregunta
                    field="telefono"
                    htmlFor="telefono"
                    title="Tu celular o WhatsApp"
                    required
                    help="Con código de área, sin 0 ni 15. Ejemplo: 3834512345."
                    error={errores.telefono}
                  >
                    <input
                      id="telefono"
                      className="gf-input short"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Tu respuesta"
                      maxLength={20}
                      value={padre.telefono}
                      onChange={(e) => setPadre({ ...padre, telefono: e.target.value, whatsapp: e.target.value })}
                      required
                    />
                    {celular && !errores.telefono && (
                      <span className="gf-ok-hint">
                        <Check size={16} aria-hidden="true" /> Te vamos a escribir al +54 9 {celular}
                      </span>
                    )}
                  </Pregunta>

                  <Pregunta
                    field="acepta_whatsapp"
                    title="¿Querés recibir los avisos de la colonia por WhatsApp?"
                    required
                    help="Por ejemplo, si se suspende por lluvia o calor."
                    error={errores.acepta_whatsapp}
                  >
                    <div className="gf-options">
                      <Opcion
                        name="acepta_whatsapp"
                        required
                        checked={padre.acepta_whatsapp === true}
                        onChange={() => setPadre({ ...padre, acepta_whatsapp: true })}
                      >
                        Sí, quiero recibirlos
                      </Opcion>
                      <Opcion
                        name="acepta_whatsapp"
                        required
                        checked={padre.acepta_whatsapp === false}
                        onChange={() => setPadre({ ...padre, acepta_whatsapp: false })}
                      >
                        No, no quiero recibirlos
                      </Opcion>
                    </div>
                  </Pregunta>

                  <Pregunta field="email" htmlFor="email" title="Tu correo electrónico" required error={errores.email}>
                    <input
                      id="email"
                      className="gf-input"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="Tu respuesta"
                      maxLength={120}
                      value={padre.email}
                      onChange={(e) => setPadre({ ...padre, email: e.target.value })}
                      required
                    />
                  </Pregunta>

                  <Pregunta
                    field="urgencia"
                    htmlFor="urgencia"
                    title="Otra persona para llamar en caso de urgencia"
                    required
                    help="Nombre y teléfono de alguien distinto a vos. Ejemplo: Carlos Gómez (papá) 3834598765"
                    error={errores.urgencia}
                  >
                    <input
                      id="urgencia"
                      className="gf-input"
                      type="text"
                      placeholder="Tu respuesta"
                      maxLength={150}
                      value={padre.contacto_urgencia}
                      onChange={(e) => setPadre({ ...padre, contacto_urgencia: e.target.value })}
                      required
                    />
                  </Pregunta>
                </>
              )}

              {paso === 2 && (
                <>
                  <Pregunta field="nino_nombre" htmlFor="nino_nombre" title="Apellido y nombre del niño o niña" required error={errores.nino_nombre}>
                    <input
                      id="nino_nombre"
                      className="gf-input"
                      type="text"
                      placeholder="Tu respuesta"
                      maxLength={120}
                      value={nino.apellido_nombre}
                      onChange={(e) => setNino({ ...nino, apellido_nombre: e.target.value })}
                      required
                    />
                  </Pregunta>

                  <Pregunta field="nacimiento" htmlFor="nacimiento" title="Fecha de nacimiento" required error={errores.nacimiento}>
                    <input
                      id="nacimiento"
                      className="gf-input"
                      type="date"
                      value={nino.fecha_nacimiento}
                      onChange={(e) => handleFechaNacimientoChange(e.target.value)}
                      required
                    />
                    {nino.edad && (
                      <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>
                        Edad: <strong>{nino.edad} años</strong>
                      </p>
                    )}
                  </Pregunta>

                  {!nino.fecha_nacimiento && (
                    <Pregunta field="edad" htmlFor="edad" title="Edad (años)" required error={errores.edad}>
                      <input
                        id="edad"
                        className="gf-input short"
                        type="number"
                        inputMode="numeric"
                        min="3"
                        max="18"
                        placeholder="Tu respuesta"
                        value={nino.edad}
                        onChange={(e) => setNino({ ...nino, edad: e.target.value })}
                        required
                      />
                    </Pregunta>
                  )}

                  <Pregunta
                    field="domicilio"
                    htmlFor="domicilio"
                    title="Domicilio"
                    required
                    help="Barrio, calle y número, localidad. Ejemplo: Bº 140 Viviendas, casa 24, San Isidro"
                    error={errores.domicilio}
                  >
                    <input
                      id="domicilio"
                      className="gf-input"
                      type="text"
                      autoComplete="street-address"
                      placeholder="Tu respuesta"
                      maxLength={200}
                      value={nino.domicilio}
                      onChange={(e) => setNino({ ...nino, domicilio: e.target.value })}
                      required
                    />
                  </Pregunta>

                  <Pregunta field="obra_social" title="¿Tiene obra social?" required error={errores.obra_social}>
                    <div className="gf-options">
                      <Opcion name="obra_social" required checked={nino.tiene_obra_social === true} onChange={() => setNino({ ...nino, tiene_obra_social: true })}>
                        Sí
                      </Opcion>
                      <Opcion
                        name="obra_social"
                        required
                        checked={nino.tiene_obra_social === false}
                        onChange={() => setNino({ ...nino, tiene_obra_social: false, obra_social_nombre: '' })}
                      >
                        No
                      </Opcion>
                    </div>
                    <AnimatePresence initial={false}>
                      {nino.tiene_obra_social === true && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <label htmlFor="os_nombre" className="gf-q-help" style={{ marginTop: 12, color: 'var(--ink-2)' }}>
                            ¿Cuál?
                          </label>
                          <input
                            id="os_nombre"
                            className="gf-input"
                            style={{ marginTop: 4 }}
                            type="text"
                            placeholder="Ejemplo: OSEP"
                            maxLength={100}
                            value={nino.obra_social_nombre}
                            onChange={(e) => setNino({ ...nino, obra_social_nombre: e.target.value })}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Pregunta>

                  <Pregunta field="vacunas" title="Vacunas" required help="Fijate en la libreta o carnet de vacunación." error={errores.vacunas}>
                    <div className="gf-options">
                      {VACUNAS.map((v) => (
                        <Opcion
                          key={v.value}
                          name="vacunas"
                          required
                          checked={nino.esquema_vacunacion === v.value}
                          onChange={() => setNino({ ...nino, esquema_vacunacion: v.value })}
                          sub={v.sub}
                        >
                          {v.label}
                        </Opcion>
                      ))}
                    </div>
                  </Pregunta>
                </>
              )}

              {paso === 3 && (
                <>
                  <div className="gf-q" data-field="medidas">
                    <div className="gf-q-title">Peso y altura</div>
                    <span className="gf-q-help">Si los sabés. El IMC se calcula solo.</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '4px 20px' }}>
                      <NumeroCorto id="peso" label="Peso (kg)" step="0.1" value={nino.peso} onChange={(v) => setNino({ ...nino, peso: v })} />
                      <NumeroCorto id="talla" label="Altura (cm)" step="0.5" value={nino.talla} onChange={(v) => setNino({ ...nino, talla: v })} />
                      <div style={{ marginTop: 14 }}>
                        <span className="gf-q-help" style={{ marginTop: 0 }}>IMC</span>
                        <div className="font-display" style={{ fontSize: '1.4rem', fontWeight: 800, color: nino.imc ? 'var(--pool-ink)' : 'var(--line-strong)', paddingTop: 6 }}>
                          {nino.imc || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="gf-q" data-field="presion">
                    <div className="gf-q-title">Presión arterial y cintura</div>
                    <span className="gf-q-help">Lo completa el equipo de salud si no lo sabés.</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '4px 20px' }}>
                      <NumeroCorto id="pa_alta" label="Presión alta" value={nino.presion_alta} onChange={(v) => setNino({ ...nino, presion_alta: v })} />
                      <NumeroCorto id="pa_baja" label="Presión baja" value={nino.presion_baja} onChange={(v) => setNino({ ...nino, presion_baja: v })} />
                      <NumeroCorto id="cintura" label="Cintura (cm)" value={nino.circunferencia_cintura} onChange={(v) => setNino({ ...nino, circunferencia_cintura: v })} />
                    </div>
                  </div>

                  <Pregunta field="atencion" title="¿Hoy recibe algún tratamiento médico?" required error={errores.atencion}>
                    <div className="gf-options">
                      <Opcion name="atencion" required checked={medica.recibe_atencion_medica === true} onChange={() => setMedica({ ...medica, recibe_atencion_medica: true })}>
                        Sí
                      </Opcion>
                      <Opcion
                        name="atencion"
                        required
                        checked={medica.recibe_atencion_medica === false}
                        onChange={() => setMedica({ ...medica, recibe_atencion_medica: false, atencion_medica_detalle: '' })}
                      >
                        No
                      </Opcion>
                    </div>
                    <AnimatePresence initial={false}>
                      {medica.recibe_atencion_medica === true && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <input
                            className="gf-input"
                            type="text"
                            aria-label="Motivo o especialista del tratamiento"
                            placeholder="¿Por qué motivo o con qué médico?"
                            maxLength={200}
                            value={medica.atencion_medica_detalle}
                            onChange={(e) => setMedica({ ...medica, atencion_medica_detalle: e.target.value })}
                            required
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Pregunta>

                  <Pregunta
                    field="antecedentes"
                    htmlFor="antecedentes"
                    title="Operaciones o internaciones anteriores"
                    help="Si no tuvo, dejalo en blanco."
                  >
                    <input
                      id="antecedentes"
                      className="gf-input"
                      type="text"
                      placeholder="Tu respuesta"
                      maxLength={300}
                      value={medica.antecedentes_personales}
                      onChange={(e) => setMedica({ ...medica, antecedentes_personales: e.target.value })}
                    />
                  </Pregunta>
                </>
              )}

              {paso === 4 && (
                <Pregunta field="patologias" title="¿Tiene alguna de estas enfermedades o condiciones?" required error={errores.patologias}>
                  <div className="gf-grid" role="table" aria-label="Enfermedades">
                    <div className="gf-grid-head" role="row">
                      <span role="columnheader" style={{ textAlign: 'left' }} />
                      <span role="columnheader">Sí</span>
                      <span role="columnheader">No</span>
                    </div>
                    {PATOLOGIAS_FORM.map((pat) => {
                      const val = medica[`${pat.key}_si`];
                      return (
                        <div key={pat.key} className={`gf-grid-row ${val === true ? 'is-si' : ''}`} role="row">
                          <span className="gf-grid-label" role="rowheader" id={`pat-${pat.key}`}>
                            {pat.label}
                            {pat.hint && <small>{pat.hint}</small>}
                          </span>
                          <label className="gf-grid-cell si">
                            <input
                              type="radio"
                              name={`pat_${pat.key}`}
                              aria-label={`${pat.label}: Sí`}
                              checked={val === true}
                              onChange={() => setMedica({ ...medica, [`${pat.key}_si`]: true })}
                              required
                            />
                            <span className="dot" />
                          </label>
                          <label className="gf-grid-cell">
                            <input
                              type="radio"
                              name={`pat_${pat.key}`}
                              aria-label={`${pat.label}: No`}
                              checked={val === false}
                              onChange={() => setMedica({ ...medica, [`${pat.key}_si`]: false, [`${pat.key}_cual`]: '' })}
                              required
                            />
                            <span className="dot" />
                          </label>
                          <AnimatePresence initial={false}>
                            {val === true && (
                              <motion.div
                                className="gf-grid-detail"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
                                style={{ overflow: 'hidden' }}
                              >
                                <label htmlFor={`cual-${pat.key}`} className="gf-q-help" style={{ marginTop: 6, color: 'var(--ink-2)' }}>
                                  ¿Cuál? Qué tiene, qué medicación toma o qué cuidados necesita
                                </label>
                                <input
                                  id={`cual-${pat.key}`}
                                  className="gf-input"
                                  type="text"
                                  placeholder="Tu respuesta"
                                  maxLength={300}
                                  value={medica[`${pat.key}_cual`]}
                                  onChange={(e) => setMedica({ ...medica, [`${pat.key}_cual`]: e.target.value })}
                                  required
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="md3-btn md3-btn-text"
                    style={{ marginTop: 12, paddingLeft: 8, paddingRight: 8 }}
                    onClick={() => {
                      const next = { ...medica };
                      PATOLOGIAS_FORM.forEach((p) => {
                        if (next[`${p.key}_si`] !== true) next[`${p.key}_si`] = false;
                      });
                      setMedica(next);
                      limpiarError('patologias');
                    }}
                  >
                    <Check size={18} /> Marcar "No" en todas las que faltan
                  </button>
                </Pregunta>
              )}

              {paso === 5 && (
                <>
                  <Pregunta
                    field="observaciones"
                    htmlFor="observaciones"
                    title="¿Algo más que tengamos que saber?"
                    help="Cuidados especiales, indicaciones para la pileta o para los profesores."
                  >
                    <textarea
                      id="observaciones"
                      className="gf-textarea"
                      rows={3}
                      placeholder="Tu respuesta"
                      maxLength={1000}
                      value={medica.observaciones}
                      onChange={(e) => setMedica({ ...medica, observaciones: e.target.value })}
                    />
                  </Pregunta>

                  <Pregunta field="responsabilidad" title="Objetos personales" required error={errores.responsabilidad}>
                    <p style={{ marginTop: 10, color: 'var(--ink-2)', fontSize: '1rem' }}>
                      La Municipalidad de Valle Viejo y los equipos de trabajo de la colonia no se hacen responsables por la
                      pérdida de ropa, dinero, celulares u otros objetos que el niño/a lleve.
                    </p>
                    <div className="gf-options">
                      <Opcion
                        type="checkbox"
                        name="responsabilidad"
                        required
                        checked={aceptaResponsabilidad}
                        onChange={(e) => setAceptaResponsabilidad(e.target.checked)}
                      >
                        Leí y estoy de acuerdo
                      </Opcion>
                    </div>
                  </Pregunta>

                  <Pregunta
                    field="firma"
                    htmlFor="firma"
                    title="Firma: escribí tu nombre completo"
                    required
                    help="Al escribir tu nombre, confirmás que los datos son correctos."
                    error={errores.firma}
                  >
                    <input
                      id="firma"
                      className="gf-input"
                      type="text"
                      autoComplete="name"
                      placeholder="Tu respuesta"
                      maxLength={120}
                      value={firmaPadre}
                      onChange={(e) => {
                        setFirmaTocada(true);
                        setFirmaPadre(e.target.value);
                      }}
                      required
                    />
                  </Pregunta>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navegación entre secciones */}
          <div className="gf-nav" style={{ marginTop: 16 }}>
            {paso > 0 && (
              <button type="button" className="md3-btn md3-btn-outlined md3-btn-big" onClick={anterior}>
                <ArrowLeft size={20} /> Atrás
              </button>
            )}
            {esUltimo ? (
              <button type="submit" className="md3-btn md3-btn-filled md3-btn-big" disabled={enviando || Boolean(dniExistente)}>
                {enviando ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                {enviando ? 'Enviando…' : 'Enviar inscripción'}
              </button>
            ) : (
              <button type="button" className="md3-btn md3-btn-filled md3-btn-big" onClick={siguiente}>
                Siguiente <ArrowRight size={20} />
              </button>
            )}
            <div className="gf-progress">
              <LaneRope total={total * 2} filled={(paso + 1) * 2} />
              <span className="gf-progress-label">
                Paso {paso + 1} de {total}
              </span>
            </div>
          </div>
        </form>

        <p className="gf-footer-note">
          Formulario oficial de la Municipalidad de Valle Viejo · No necesitás crear una cuenta
        </p>
        <p className="gf-footer-note" style={{ paddingTop: 0 }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 44, color: 'var(--ink-3)' }}>
            <Lock size={14} /> Ingreso para coordinadores
          </Link>
        </p>
      </div>
    </div>
  );
}

function NumeroCorto({ id, label, value, onChange, step }) {
  return (
    <div style={{ marginTop: 14 }}>
      <label htmlFor={id} className="gf-q-help" style={{ marginTop: 0 }}>
        {label}
      </label>
      <input
        id={id}
        className="gf-input"
        style={{ marginTop: 2 }}
        type="number"
        inputMode="decimal"
        step={step || 'any'}
        min="0"
        placeholder="—"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function WaterLogos() {
  return (
    <div className="gf-water-logos">
      <span className="logo-chip"><img src={asset('logodeporte.png')} alt="Deporte Valle Viejo" /></span>
      <span className="logo-chip">
        <img src={asset('logovalleviejociudad.png')} alt="Municipalidad de Valle Viejo" />
      </span>
    </div>
  );
}
