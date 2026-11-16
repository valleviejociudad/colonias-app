import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CloudLightning, Info, X } from 'lucide-react';
import { API_BASE } from '../../config';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-01-12 08:30:00" (hora local) -> "lunes 12 de enero"
function diaLargo(raw) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw || ''));
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

const CLAVE_OCULTOS = 'avisos-ocultos';
function leerOcultos() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_OCULTOS) || '[]');
  } catch {
    return [];
  }
}

export default function AlertaClimaticaBanner({ refreshTrigger = 0 }) {
  const [alertas, setAlertas] = useState([]);
  const [ocultos, setOcultos] = useState(leerOcultos);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetch(`${API_BASE}/alertas`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAlertas(data.filter((a) => a.activa === 1));
      })
      .catch(() => {});
  }, [refreshTrigger]);

  const ocultar = (id) => {
    setOcultos((prev) => {
      const next = [...prev, id];
      try {
        sessionStorage.setItem(CLAVE_OCULTOS, JSON.stringify(next));
      } catch {
        /* sin almacenamiento: queda oculto hasta recargar */
      }
      return next;
    });
  };

  const visibles = alertas.filter((a) => !ocultos.includes(a.id));

  return (
    <div className="no-print" aria-live="polite">
      <AnimatePresence initial={false}>
        {visibles.map((alerta) => {
          const susp = Number(alerta.suspende ?? (alerta.tipo === 'suspension' ? 1 : 0)) === 1;
          const Icon = susp ? CloudLightning : Info;
          const fecha = diaLargo(alerta.created_at);
          return (
            <motion.div
              key={alerta.id}
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className={`aviso-banner${susp ? '' : ' is-info'}`}
            >
              <span className="aviso-banner-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <div className="aviso-banner-body">
                <p className="aviso-banner-where">
                  {alerta.colonia_nombre || 'Todas las localidades'}
                  {fecha && <span> · {fecha}</span>}
                </p>
                <strong className="aviso-banner-title">{alerta.titulo}</strong>
                <p className="aviso-banner-msg">{alerta.mensaje}</p>
              </div>
              <button
                type="button"
                onClick={() => ocultar(alerta.id)}
                className="tool-btn aviso-banner-close"
                aria-label="Ocultar este aviso"
                title="Ocultar este aviso"
              >
                <X size={20} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
