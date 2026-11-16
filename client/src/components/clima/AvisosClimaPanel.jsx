import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CloudLightning,
  CloudRain,
  Copy,
  Loader2,
  Mail,
  MapPin,
  MapPinned,
  MessageCircle,
  PenLine,
  Send,
  Sun,
  Thermometer,
  Users,
  Waves,
  Wind,
  X,
  Zap
} from 'lucide-react';

const EASE_OUT = [0.23, 1, 0.32, 1];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Mensajes listos para usar: se elige uno y el texto queda escrito (se puede cambiar antes de enviar).
// "suspende" y "duracion" son los valores que se marcan solos al elegirlo.
const PLANTILLAS = [
  {
    id: 'lluvia',
    grupo: 'suspension',
    icon: CloudRain,
    nombre: 'Lluvia o tormenta',
    titulo: 'Suspensión por lluvia o tormenta',
    mensaje:
      'Por la lluvia y el pronóstico de tormenta, y para cuidar a los chicos, se suspenden las actividades de la colonia. Les avisamos por este medio cuando se retomen.',
    suspende: true,
    duracion: 'hoy'
  },
  {
    id: 'calor',
    grupo: 'suspension',
    icon: Thermometer,
    nombre: 'Calor extremo',
    titulo: 'Suspensión por calor extremo',
    mensaje:
      'Por la alerta de calor extremo, y para cuidar la salud de los chicos, se suspenden las actividades de la colonia. Recuerden darles mucha agua y evitar el sol del mediodía.',
    suspende: true,
    duracion: 'hoy'
  },
  {
    id: 'viento',
    grupo: 'suspension',
    icon: Wind,
    nombre: 'Viento fuerte',
    titulo: 'Suspensión por viento fuerte',
    mensaje:
      'Por el viento fuerte y la tierra en el aire, se suspenden las actividades de la colonia para cuidar a los chicos. Les avisamos por este medio cuando se retomen.',
    suspende: true,
    duracion: 'hoy'
  },
  {
    id: 'servicio',
    grupo: 'suspension',
    icon: Zap,
    nombre: 'Sin agua o sin luz',
    titulo: 'Suspensión por corte de agua o luz',
    mensaje:
      'Por un corte de agua o de luz en el predio, no podemos recibir a los chicos y se suspenden las actividades de la colonia. Les avisamos apenas se normalice.',
    suspende: true,
    duracion: 'hasta_levantar'
  },
  {
    id: 'pileta',
    grupo: 'aviso',
    icon: Waves,
    nombre: 'Pileta cerrada',
    titulo: 'Pileta cerrada',
    mensaje:
      'La pileta está cerrada por mantenimiento. La colonia funciona igual, con otras actividades: no hace falta mandar la malla.',
    suspende: false,
    duracion: 'hasta_levantar'
  },
  {
    id: 'horario',
    grupo: 'aviso',
    icon: Clock,
    nombre: 'Cambio de horario',
    titulo: 'Cambio de horario',
    mensaje:
      'Por el calor, la colonia cambia su horario. Consultá el nuevo horario de entrada y salida con el coordinador de tu colonia.',
    suspende: false,
    duracion: 'hasta_levantar'
  },
  {
    id: 'retoman',
    grupo: 'aviso',
    icon: Sun,
    nombre: 'Vuelven las actividades',
    titulo: 'Vuelven las actividades',
    mensaje: 'Las actividades de la colonia vuelven con normalidad. ¡Los esperamos!',
    suspende: false,
    duracion: 'hoy'
  },
  {
    id: 'propio',
    grupo: 'propio',
    icon: PenLine,
    nombre: 'Escribir mi propio mensaje',
    titulo: '',
    mensaje: '',
    suspende: true,
    duracion: 'hoy'
  }
];
const GRUPOS_PLANTILLAS = [
  ['suspension', 'Suspender la colonia'],
  ['aviso', 'Otros avisos']
];

const FORM_INICIAL = {
  plantilla: '',
  colonias: [], // ids (texto) de las localidades elegidas
  titulo: '',
  mensaje: '',
  suspender_colonia: true,
  enviar_email: true,
  duracion: 'hoy'
};

// "2026-01-12 08:30:00" (hora local) -> Date
function aFecha(raw) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(raw || ''));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
}
const diaLargo = (d) => (d ? `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}` : '');
const hora = (d) => (d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '');
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function cuandoTermina(alerta) {
  if (!alerta.vence) return 'Sigue hasta que lo levantes.';
  const v = aFecha(alerta.vence);
  const hoy = new Date();
  const esHoy = v && v.toDateString() === hoy.toDateString();
  return esHoy ? 'Se termina solo hoy a la noche.' : `Se termina solo el ${diaLargo(v)} a la noche.`;
}

/* ---------- Lista de WhatsApp: marca a quién ya se le mandó ---------- */

function leerEnviados(alertaId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`aviso-wa-${alertaId}`) || '[]'));
  } catch {
    return new Set();
  }
}

function ListaWhatsApp({ alertaId, links }) {
  const [enviados, setEnviados] = useState(() => leerEnviados(alertaId));

  const marcar = (clave) => {
    setEnviados((prev) => {
      const next = new Set(prev);
      next.add(clave);
      try {
        localStorage.setItem(`aviso-wa-${alertaId}`, JSON.stringify([...next]));
      } catch {
        /* sin almacenamiento: la marca dura mientras la página esté abierta */
      }
      return next;
    });
  };

  const hechos = links.filter((l) => enviados.has(l.clave)).length;

  if (links.length === 0) {
    return <p className="wa-hint">Ninguna familia de esta localidad tiene un celular para WhatsApp.</p>;
  }

  return (
    <div className="wa-block">
      <p className="wa-hint">Para las familias que no están en la Comunidad. Quienes pidieron no recibir WhatsApp no aparecen.</p>
      <p className="wa-progress" aria-live="polite">
        <strong>
          {hechos} de {plural(links.length, 'familia', 'familias')}
        </strong>{' '}
        {hechos === links.length ? 'avisadas. ¡Listo!' : 'avisadas'}
      </p>
      <ul className="wa-list">
        {links.map((it) => {
          const listo = enviados.has(it.clave);
          return (
            <li key={it.clave} className={`wa-row${listo ? ' is-sent' : ''}`}>
              <div className="wa-who">
                <strong>{it.padre_nombre}</strong>
                <span>
                  {it.nino_nombre ? `Por ${it.nino_nombre} · ` : ''}
                  {it.telefono}
                </span>
                {listo && (
                  <span className="wa-done">
                    <Check size={16} aria-hidden="true" /> Enviado
                  </span>
                )}
              </div>
              <a
                href={it.wa_link}
                target="_blank"
                rel="noreferrer"
                onClick={() => marcar(it.clave)}
                className={`md3-btn ${listo ? 'md3-btn-outlined' : 'md3-btn-success'}`}
                aria-label={`${listo ? 'Volver a mandar' : 'Mandar'} WhatsApp a ${it.padre_nombre}`}
              >
                <MessageCircle size={18} aria-hidden="true" /> {listo ? 'Otra vez' : 'Enviar'}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Mandar el aviso por WhatsApp: primero a la Comunidad, después familia por familia ---------- */

function DifusionWhatsApp({ alertaId, mensaje, links, comunidadLink }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <>
      <div className="comunidad-send">
        <p className="comunidad-send-title">
          <Users size={20} aria-hidden="true" /> Mandar a la Comunidad de WhatsApp
        </p>
        <p>
          Se abre WhatsApp con el mensaje ya escrito. Elegí el grupo de avisos de la Comunidad y tocá enviar.
          {!comunidadLink && ' Todavía no cargaste el link de la Comunidad para que las familias se unan.'}
        </p>
        <div className="comunidad-send-actions">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensaje || '')}`}
            target="_blank"
            rel="noreferrer"
            className="md3-btn md3-btn-success md3-btn-big"
          >
            <MessageCircle size={20} aria-hidden="true" /> Mandar a la Comunidad
          </a>
          <button type="button" className="md3-btn md3-btn-outlined" onClick={copiar}>
            {copiado ? <Check size={18} /> : <Copy size={18} />}
            {copiado ? 'Mensaje copiado' : 'Copiar mensaje'}
          </button>
        </div>
        <span className="sr-only" role="status">
          {copiado ? 'Mensaje copiado' : ''}
        </span>
      </div>

      <details className="wa-familias">
        <summary>
          <span>Mandar a cada familia por separado ({links.length})</span>
          <ChevronDown size={20} aria-hidden="true" />
        </summary>
        <ListaWhatsApp alertaId={alertaId} links={links} />
      </details>
    </>
  );
}

/* ---------- Link de la Comunidad (lo carga el personal una vez por temporada) ---------- */

function ComunidadAjuste({ link, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(link || '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editando) setValor(link || '');
  }, [link, editando]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const err = await onGuardar(valor.trim());
    setGuardando(false);
    if (err) setError(err);
    else setEditando(false);
  };

  return (
    <div className="comunidad-panel">
      <div className="comunidad-panel-head">
        <p className="comunidad-panel-title">
          <Users size={20} aria-hidden="true" /> Comunidad de WhatsApp
        </p>
        {!editando && (
          <button type="button" className="md3-btn md3-btn-text" onClick={() => setEditando(true)}>
            {link ? 'Cambiar link' : 'Cargar link'}
          </button>
        )}
      </div>
      {!editando &&
        (link ? (
          <p>
            Las familias ven el botón para unirse al terminar la inscripción y en su ficha.{' '}
            <a className="comunidad-panel-link" href={link} target="_blank" rel="noreferrer">
              {link}
            </a>
          </p>
        ) : (
          <p>Todavía no está cargado. Sin el link, las familias no ven la invitación para unirse.</p>
        ))}
      {editando && (
        <form onSubmit={guardar}>
          <label className="md3-label" htmlFor="comunidad-link">
            Link de invitación
          </label>
          <input
            id="comunidad-link"
            className="md3-input"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="https://chat.whatsapp.com/…"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <span className="field-hint">
            En WhatsApp: abrí la Comunidad, tocá “Invitar a la comunidad” y copiá el enlace. Dejalo vacío para sacarlo.
          </span>
          {error && (
            <div className="notice danger" role="alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
          <div className="comunidad-panel-actions">
            <button type="submit" className="md3-btn md3-btn-filled" disabled={guardando}>
              {guardando && <Loader2 size={18} className="spin" />} Guardar
            </button>
            <button type="button" className="md3-btn md3-btn-outlined" onClick={() => setEditando(false)} disabled={guardando}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ---------- Opción de mensaje ya escrito ---------- */

// Botón de opción grande: radio (una sola) o casilla (varias, con cuadradito a la derecha)
function OpcionTile({ tipo = 'radio', name, variante, icon: Icon, nombre, sub, elegida, onCambio }) {
  return (
    <label className={`plantilla is-${variante}${elegida ? ' is-checked' : ''}`}>
      <input type={tipo} name={name} checked={elegida} onChange={onCambio} />
      <span className="plantilla-icon" aria-hidden="true">
        <Icon size={20} />
      </span>
      <span className="plantilla-nombre">
        {nombre}
        {sub && <span className="plantilla-sub">{sub}</span>}
      </span>
      {tipo === 'checkbox' ? (
        <span className="plantilla-box" aria-hidden="true">
          <Check size={14} strokeWidth={3.5} />
        </span>
      ) : (
        elegida && <Check size={18} strokeWidth={3} className="plantilla-check" aria-hidden="true" />
      )}
    </label>
  );
}

function PlantillaOpcion({ p, elegida, onElegir }) {
  return (
    <OpcionTile
      name="al-plantilla"
      variante={p.grupo}
      icon={p.icon}
      nombre={p.nombre}
      elegida={elegida}
      onCambio={() => onElegir(p)}
    />
  );
}

/* ---------- Estado del correo, en palabras simples ---------- */

function EstadoCorreo({ r }) {
  if (!r || r.modo === 'no_pedido') {
    return (
      <p className="aviso-line">
        <Mail size={18} aria-hidden="true" /> No se mandó correo.
      </p>
    );
  }
  if (r.modo === 'sin_destinatarios') {
    return (
      <p className="aviso-line">
        <Mail size={18} aria-hidden="true" /> No se mandó correo: ninguna familia tiene correo cargado.
      </p>
    );
  }
  if (r.modo === 'sin_configurar') {
    return (
      <div className="notice warn">
        <AlertCircle size={20} />
        <div>
          <strong>No se mandaron los correos.</strong> El correo del sistema no está configurado: avisale a sistemas.
          Mientras tanto, avisá por WhatsApp.
          <details className="tech-details">
            <summary>Detalle para sistemas</summary>
            Faltan las variables SMTP_HOST, SMTP_USER y SMTP_PASS en el servidor.
          </details>
        </div>
      </div>
    );
  }
  const partes = [];
  if (r.fallidos) partes.push(`${plural(r.fallidos, 'no se pudo mandar', 'no se pudieron mandar')}`);
  if (r.sin_email) partes.push(`${plural(r.sin_email, 'familia no tiene', 'familias no tienen')} correo cargado`);
  return (
    <>
      {r.modo === 'ethereal_test' && (
        <div className="notice warn">
          <AlertCircle size={20} />
          <span>
            <strong>Modo de prueba:</strong> los correos fueron a un buzón de prueba y no les llegaron a las familias.
            {r.previewUrl && (
              <>
                {' '}
                <a href={r.previewUrl} target="_blank" rel="noreferrer">
                  Ver el correo de prueba
                </a>
              </>
            )}
          </span>
        </div>
      )}
      <p className="aviso-line">
        <Mail size={18} aria-hidden="true" />
        <span>
          Correo enviado a <strong>{plural(r.enviados, 'familia', 'familias')}</strong>
          {partes.length ? `. ${partes.join(' y ')}.` : '.'}
        </span>
      </p>
    </>
  );
}

/* ---------- Panel ---------- */

export default function AvisosClimaPanel({ colonias, alertas, authFetch, onCambio, onUnauthorized }) {
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState(FORM_INICIAL);
  const [paso, setPaso] = useState('form'); // form | confirmar | resultado
  const [conteo, setConteo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [okLevantado, setOkLevantado] = useState(null);
  const [levantando, setLevantando] = useState(null);
  const [listas, setListas] = useState({}); // alertaId -> { cargando, data, error }
  const [comunidadLink, setComunidadLink] = useState(null);

  useEffect(() => {
    fetch('/api/comunidad')
      .then((r) => r.json())
      .then((d) => setComunidadLink(d?.link || null))
      .catch(() => {});
  }, []);

  // Devuelve el texto del error, o null si se guardó
  const guardarComunidad = async (link) => {
    try {
      const res = await authFetch('/api/comunidad', { method: 'PUT', body: JSON.stringify({ link }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || 'No se pudo guardar el link. Probá de nuevo.';
      setComunidadLink(data.link || null);
      return null;
    } catch (err) {
      if (err?.code === 'UNAUTHORIZED') {
        onUnauthorized();
        return null;
      }
      return 'No se pudo guardar el link. Revisá tu conexión.';
    }
  };

  const cardRef = useRef(null);
  const primerRender = useRef(true);
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
  }, []);
  // El título de cada paso recibe el foco al aparecer (no en la primera carga de la pestaña)
  const tituloPasoRef = useCallback((node) => {
    if (node && montado.current) node.focus({ preventScroll: true });
  }, []);

  const activas = useMemo(() => alertas.filter((a) => a.activa === 1), [alertas]);
  const anteriores = useMemo(() => alertas.filter((a) => a.activa !== 1), [alertas]);

  const sonTodas = colonias.length > 0 && form.colonias.length === colonias.length;
  const nombresElegidos = colonias.filter((c) => form.colonias.includes(String(c.id))).map((c) => c.nombre);
  const alcance = sonTodas
    ? 'todas las localidades'
    : nombresElegidos.length > 1
      ? `${nombresElegidos.slice(0, -1).join(', ')} y ${nombresElegidos[nombresElegidos.length - 1]}`
      : nombresElegidos[0] || '';

  const alternarLocalidad = (id) => {
    setError(null);
    setForm((f) => ({
      ...f,
      colonias: f.colonias.includes(id) ? f.colonias.filter((x) => x !== id) : [...f.colonias, id]
    }));
  };
  const alternarTodas = () => {
    setError(null);
    setForm((f) => ({ ...f, colonias: sonTodas ? [] : colonias.map((c) => String(c.id)) }));
  };

  // Al cambiar de paso: llevar la vista y el foco al principio de la tarjeta (en celular quedaba fuera de pantalla)
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    cardRef.current?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [paso, reduceMotion]);

  const manejarError = (err, texto) => {
    if (err?.code === 'UNAUTHORIZED') {
      onUnauthorized();
      return;
    }
    setError(texto);
  };

  const elegirPlantilla = (p) => {
    setError(null);
    setForm((f) => ({
      ...f,
      plantilla: p.id,
      titulo: p.titulo,
      mensaje: p.mensaje,
      suspender_colonia: p.suspende,
      duracion: p.duracion
    }));
  };

  const revisar = async (e) => {
    e.preventDefault();
    if (form.colonias.length === 0) {
      setError('Elegí al menos una localidad.');
      return;
    }
    if (!form.plantilla) {
      setError('Elegí qué pasó: un mensaje ya escrito o “Escribir mi propio mensaje”.');
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const q = sonTodas ? '' : `?colonia_ids=${encodeURIComponent(form.colonias.join(','))}`;
      const res = await authFetch(`/api/alertas/destinatarios${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No pudimos contar las familias. Probá de nuevo.');
        return;
      }
      setConteo(data);
      setPaso('confirmar');
    } catch (err) {
      manejarError(err, 'No pudimos contar las familias. Revisá tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  const enviar = async () => {
    setError(null);
    setCargando(true);
    try {
      const res = await authFetch('/api/alertas', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          colonias: undefined,
          colonia_ids: sonTodas ? null : form.colonias.map(Number)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo publicar el aviso. Probá de nuevo.');
        return;
      }
      setResultado(data);
      setPaso('resultado');
      onCambio();
    } catch (err) {
      manejarError(err, 'No se pudo publicar el aviso. Revisá tu conexión y probá de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  const nuevoAviso = () => {
    setForm(FORM_INICIAL);
    setResultado(null);
    setConteo(null);
    setError(null);
    setPaso('form');
  };

  const levantar = async (alerta) => {
    setError(null);
    setOkLevantado(null);
    setLevantando(alerta.id);
    try {
      const res = await authFetch(`/api/alertas/${alerta.id}/desactivar`, { method: 'PUT' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'No se pudo levantar el aviso. Probá de nuevo.');
        return;
      }
      setOkLevantado(
        `Listo: el aviso de ${alerta.colonia_nombre || 'todas las localidades'} ya no se muestra a las familias.`
      );
      onCambio();
    } catch (err) {
      manejarError(err, 'No se pudo levantar el aviso. Revisá tu conexión.');
    } finally {
      setLevantando(null);
    }
  };

  const toggleLista = async (alertaId) => {
    if (listas[alertaId]) {
      setListas((p) => {
        const n = { ...p };
        delete n[alertaId];
        return n;
      });
      return;
    }
    setListas((p) => ({ ...p, [alertaId]: { cargando: true } }));
    try {
      const res = await authFetch(`/api/alertas/${alertaId}/whatsapp`);
      const data = await res.json().catch(() => ({}));
      setListas((p) => ({
        ...p,
        [alertaId]: res.ok ? { data } : { error: data.error || 'No pudimos armar la lista.' }
      }));
    } catch (err) {
      if (err?.code === 'UNAUTHORIZED') return onUnauthorized();
      setListas((p) => ({ ...p, [alertaId]: { error: 'No pudimos armar la lista. Revisá tu conexión.' } }));
    }
  };

  const errorBox = error && (
    <div className="notice danger" role="alert">
      <AlertCircle size={20} />
      <span style={{ flex: 1 }}>{error}</span>
      <button type="button" className="tool-btn danger" onClick={() => setError(null)} aria-label="Cerrar mensaje de error">
        <X size={16} />
      </button>
    </div>
  );

  const pasoMotion = {
    initial: reduceMotion ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 },
    transition: { duration: 0.22, ease: EASE_OUT }
  };

  return (
    <div className="clima">
      {/* ---------- En curso: lo primero que hay que saber ---------- */}
      <section className="clima-encurso" aria-labelledby="clima-encurso-h">
        <h2 id="clima-encurso-h" className="clima-h">
          Avisos en curso
        </h2>

        {okLevantado && (
          <div className="notice ok" role="status">
            <CheckCircle2 size={20} />
            <span style={{ flex: 1 }}>{okLevantado}</span>
            <button type="button" className="tool-btn" onClick={() => setOkLevantado(null)} aria-label="Cerrar mensaje">
              <X size={16} />
            </button>
          </div>
        )}

        {activas.length === 0 ? (
          <div className="aviso-ninguno">
            <CheckCircle2 size={22} aria-hidden="true" />
            <span>No hay ningún aviso. Las familias no ven nada en el formulario.</span>
          </div>
        ) : (
          activas.map((al) => {
            const creado = aFecha(al.created_at);
            const lista = listas[al.id];
            return (
              <article key={al.id} className="aviso-activo">
                <div className="aviso-top">
                  <span className="aviso-scope">{al.colonia_nombre || 'Todas las localidades'}</span>
                  <span className="aviso-tag">{al.suspende ? 'Suspendida' : 'Solo aviso'}</span>
                </div>
                <p className="aviso-titulo">{al.titulo}</p>
                <p className="aviso-msg">{al.mensaje}</p>
                <p className="aviso-meta">
                  Publicado el {diaLargo(creado)} a las {hora(creado)}
                  {al.creado_por ? ` por ${al.creado_por}` : ''} · {plural(al.destinatarios_count || 0, 'familia', 'familias')}.{' '}
                  {cuandoTermina(al)}
                </p>
                <div className="aviso-actions">
                  <button
                    type="button"
                    className="md3-btn md3-btn-outlined"
                    onClick={() => levantar(al)}
                    disabled={levantando === al.id}
                  >
                    {levantando === al.id && <Loader2 size={18} className="spin" />}
                    {al.suspende ? 'Levantar suspensión' : 'Quitar aviso'}
                  </button>
                  <button
                    type="button"
                    className="md3-btn md3-btn-text"
                    onClick={() => toggleLista(al.id)}
                    aria-expanded={!!lista}
                  >
                    <MessageCircle size={18} aria-hidden="true" />
                    {lista ? 'Ocultar WhatsApp' : 'Mandar por WhatsApp'}
                  </button>
                </div>
                {lista?.cargando && (
                  <p className="aviso-line">
                    <Loader2 size={18} className="spin" /> Armando la lista…
                  </p>
                )}
                {lista?.error && <p className="aviso-line">{lista.error}</p>}
                {lista?.data && (
                  <DifusionWhatsApp
                    alertaId={al.id}
                    mensaje={lista.data.mensaje}
                    links={lista.data.whatsappLinks}
                    comunidadLink={comunidadLink}
                  />
                )}
              </article>
            );
          })
        )}
      </section>

      <div className="clima-comunidad">
        <ComunidadAjuste link={comunidadLink} onGuardar={guardarComunidad} />
      </div>

      {/* ---------- Escribir, revisar, enviar ---------- */}
      <section className="clima-form gf-card" ref={cardRef}>
        <AnimatePresence mode="wait" initial={false}>
          {paso === 'form' && (
            <motion.div key="form" {...pasoMotion}>
              <h2 className="clima-h with-icon" ref={tituloPasoRef} tabIndex={-1}>
                <CloudLightning size={24} color="var(--warn)" aria-hidden="true" /> Avisar a las familias
              </h2>
              <p className="clima-intro">
                El aviso aparece en el formulario de inscripción. Además podés mandarlo por correo y por WhatsApp. Antes
                de enviarlo vas a ver a cuántas familias les llega.
              </p>

              <form onSubmit={revisar}>
                <fieldset className="clima-fieldset">
                  <legend className="md3-label">
                    ¿A qué localidades? <span className="md3-required">*</span>
                  </legend>
                  <span className="field-hint">Podés elegir una o varias.</span>
                  <div className="plantillas localidades">
                    {colonias.map((c) => {
                      const id = String(c.id);
                      const elegida = form.colonias.includes(id);
                      return (
                        <OpcionTile
                          key={id}
                          tipo="checkbox"
                          name="al-localidad"
                          variante="localidad"
                          icon={MapPin}
                          nombre={c.nombre}
                          sub={
                            c.suspendida === 1
                              ? 'Ya está suspendida'
                              : `${plural(c.total_inscriptos || 0, 'chico inscripto', 'chicos inscriptos')}`
                          }
                          elegida={elegida}
                          onCambio={() => alternarLocalidad(id)}
                        />
                      );
                    })}
                    {colonias.length > 1 && (
                      <OpcionTile
                        tipo="checkbox"
                        name="al-localidad-todas"
                        variante="todas"
                        icon={MapPinned}
                        nombre="Todas las localidades"
                        elegida={sonTodas}
                        onCambio={alternarTodas}
                      />
                    )}
                  </div>
                </fieldset>

                <fieldset className="clima-fieldset">
                  <legend className="md3-label">
                    ¿Qué pasó? <span className="md3-required">*</span>
                  </legend>
                  <span className="field-hint">Elegí un mensaje ya escrito. Lo podés cambiar antes de enviarlo.</span>
                  {GRUPOS_PLANTILLAS.map(([grupo, nombreGrupo]) => (
                    <div key={grupo} className="plantillas-grupo">
                      <p className="plantillas-grupo-h">{nombreGrupo}</p>
                      <div className="plantillas">
                        {PLANTILLAS.filter((p) => p.grupo === grupo).map((p) => (
                          <PlantillaOpcion key={p.id} p={p} elegida={form.plantilla === p.id} onElegir={elegirPlantilla} />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="plantillas plantillas-propio">
                    <PlantillaOpcion
                      p={PLANTILLAS.find((p) => p.id === 'propio')}
                      elegida={form.plantilla === 'propio'}
                      onElegir={elegirPlantilla}
                    />
                  </div>
                </fieldset>

                {form.plantilla === 'retoman' && activas.some((a) => a.suspende) && (
                  <div className="notice warn" style={{ marginBottom: 16 }}>
                    <AlertCircle size={20} />
                    <span>
                      Hay una suspensión en curso. Acordate de levantarla en “Avisos en curso”, así la localidad deja de
                      figurar como suspendida.
                    </span>
                  </div>
                )}

                {form.plantilla && (
                <>
                <div className="md3-field">
                  <label className="md3-label" htmlFor="al-titulo">
                    Título del aviso
                  </label>
                  <input
                    id="al-titulo"
                    type="text"
                    className="md3-input"
                    maxLength={120}
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    required
                  />
                </div>

                <div className="md3-field">
                  <label className="md3-label" htmlFor="al-mensaje">
                    Mensaje para las familias
                  </label>
                  <textarea
                    id="al-mensaje"
                    rows={4}
                    className="md3-textarea"
                    maxLength={1000}
                    value={form.mensaje}
                    onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                    required
                  />
                  <span className="field-hint">
                    {form.plantilla === 'propio'
                      ? 'Escribilo corto y claro. La fecha de hoy se agrega sola.'
                      : 'Ya está escrito: cambialo solo si hace falta. La fecha de hoy se agrega sola.'}
                  </span>
                </div>

                <fieldset className="clima-fieldset">
                  <legend className="md3-label">¿Hasta cuándo se ve?</legend>
                  <div className="gf-options">
                    {[
                      ['hoy', 'Solo hoy', 'Se termina solo a la noche.'],
                      ['hasta_levantar', 'Hasta que lo levante', 'Lo quitás vos desde “Avisos en curso”.']
                    ].map(([v, txt, sub]) => (
                      <label key={v} className="gf-option">
                        <input
                          type="radio"
                          name="al-duracion"
                          value={v}
                          checked={form.duracion === v}
                          onChange={() => setForm({ ...form, duracion: v })}
                        />
                        <span className="dot" />
                        <span className="opt-main">
                          <span>{txt}</span>
                          <span className="opt-sub">{sub}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="clima-fieldset">
                  <legend className="md3-label">Qué más hacer</legend>
                  <div className="gf-options">
                    <label className="gf-option">
                      <input
                        type="checkbox"
                        checked={form.suspender_colonia}
                        onChange={(e) => setForm({ ...form, suspender_colonia: e.target.checked })}
                      />
                      <span className="box">
                        <Check size={16} strokeWidth={3} />
                      </span>
                      <span className="opt-main">
                        <span>Suspender las actividades</span>
                        <span className="opt-sub">En el formulario, la localidad aparece como suspendida.</span>
                      </span>
                    </label>
                    <label className="gf-option">
                      <input
                        type="checkbox"
                        checked={form.enviar_email}
                        onChange={(e) => setForm({ ...form, enviar_email: e.target.checked })}
                      />
                      <span className="box">
                        <Check size={16} strokeWidth={3} />
                      </span>
                      <span className="opt-main">
                        <span>Mandar correo a las familias</span>
                        <span className="opt-sub">La lista de WhatsApp se arma siempre.</span>
                      </span>
                    </label>
                  </div>
                </fieldset>
                </>
                )}

                {errorBox}

                <button type="submit" className="md3-btn md3-btn-filled md3-btn-big clima-submit" disabled={cargando}>
                  {cargando ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                  {cargando ? 'Contando familias…' : 'Revisar antes de enviar'}
                </button>
              </form>
            </motion.div>
          )}

          {paso === 'confirmar' && conteo && (
            <motion.div key="confirmar" {...pasoMotion}>
              <h2 className="clima-h" ref={tituloPasoRef} tabIndex={-1}>
                Revisá el aviso
              </h2>
              <p className="confirm-lead">
                Vas a avisar a <strong>{plural(conteo.familias, 'familia', 'familias')}</strong> de{' '}
                <strong>{alcance}</strong>.
              </p>

              {conteo.familias === 0 && (
                <div className="notice warn">
                  <AlertCircle size={20} />
                  <span>Esta localidad no tiene familias inscriptas. El aviso igual se muestra en el formulario.</span>
                </div>
              )}

              <dl className="confirm-list">
                <div>
                  <dt>En el formulario</dt>
                  <dd>
                    {form.duracion === 'hoy'
                      ? `Se ve solo hoy, ${diaLargo(new Date())}.`
                      : 'Se ve hasta que lo levantes.'}
                  </dd>
                </div>
                <div>
                  <dt>Actividades</dt>
                  <dd>{form.suspender_colonia ? 'Quedan suspendidas.' : 'No se suspenden: es solo un aviso.'}</dd>
                </div>
                <div>
                  <dt>Correo</dt>
                  <dd>
                    {!form.enviar_email
                      ? 'No se manda.'
                      : `Se manda a ${plural(conteo.con_email, 'familia', 'familias')}${
                          conteo.familias - conteo.con_email > 0
                            ? ` (${plural(conteo.familias - conteo.con_email, 'no tiene', 'no tienen')} correo cargado)`
                            : ''
                        }.`}
                  </dd>
                </div>
                <div>
                  <dt>WhatsApp</dt>
                  <dd>
                    Lo mandás a la Comunidad con un botón. Si hace falta, también tenés la lista de{' '}
                    {plural(conteo.con_telefono, 'familia', 'familias')} para mandarlo una por una.
                  </dd>
                </div>
              </dl>

              <div className="aviso-preview">
                <p className="aviso-preview-k">Así lo van a ver</p>
                <p className="aviso-titulo">{form.titulo}</p>
                <p className="aviso-msg">{form.mensaje}</p>
              </div>

              {errorBox}

              <div className="confirm-actions">
                <button type="button" className="md3-btn md3-btn-outlined" onClick={() => setPaso('form')} disabled={cargando}>
                  <ArrowLeft size={18} /> Volver a editar
                </button>
                <button type="button" className="md3-btn md3-btn-filled md3-btn-big" onClick={enviar} disabled={cargando}>
                  {cargando ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                  {cargando ? 'Publicando…' : 'Sí, publicar y avisar'}
                </button>
              </div>
            </motion.div>
          )}

          {paso === 'resultado' && resultado && (
            <motion.div key="resultado" {...pasoMotion}>
              <h2 className="clima-h with-icon" ref={tituloPasoRef} tabIndex={-1}>
                <CheckCircle2 size={24} color="var(--ok)" aria-hidden="true" /> Aviso publicado
              </h2>
              <p className="clima-intro">
                Ya se ve en el formulario de inscripción
                {resultado.alerta?.suspende ? ' y la localidad figura como suspendida' : ''}.
              </p>
              <EstadoCorreo r={resultado.emailResult} />
              <DifusionWhatsApp
                alertaId={resultado.alerta?.id}
                mensaje={resultado.mensajeWhatsApp}
                links={resultado.whatsappLinks || []}
                comunidadLink={resultado.comunidadLink ?? comunidadLink}
              />
              <button type="button" className="md3-btn md3-btn-outlined clima-submit" onClick={nuevoAviso}>
                Escribir otro aviso
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ---------- Historial ---------- */}
      {anteriores.length > 0 && (
        <details className="clima-historial gf-card">
          <summary>
            <span>Avisos anteriores ({anteriores.length})</span>
            <ChevronDown size={20} aria-hidden="true" />
          </summary>
          <ul className="historial-list">
            {anteriores.map((al) => {
              const creado = aFecha(al.created_at);
              return (
                <li key={al.id}>
                  <div className="aviso-top">
                    <strong>{al.colonia_nombre || 'Todas las localidades'}</strong>
                    <span className="historial-fecha">{diaLargo(creado)}</span>
                  </div>
                  <p className="historial-titulo">{al.titulo}</p>
                  <p className="historial-msg">{al.mensaje}</p>
                  <p className="historial-meta">
                    {plural(al.destinatarios_count || 0, 'familia', 'familias')}
                    {al.creado_por ? ` · por ${al.creado_por}` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
