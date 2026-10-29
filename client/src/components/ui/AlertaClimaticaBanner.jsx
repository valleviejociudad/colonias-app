import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudLightning, AlertTriangle, X } from 'lucide-react';

export default function AlertaClimaticaBanner({ refreshTrigger = 0 }) {
  const [alertas, setAlertas] = useState([]);
  const [dismissedIds, setDismissedIds] = useState([]);

  useEffect(() => {
    fetch('/api/alertas')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAlertas(data.filter((a) => a.activa === 1));
        }
      })
      .catch(() => {});
  }, [refreshTrigger]);

  const visibles = alertas.filter((a) => !dismissedIds.includes(a.id));

  if (visibles.length === 0) return null;

  return (
    <div className="no-print" style={{ marginBottom: '16px' }}>
      <AnimatePresence>
        {visibles.map((alerta) => (
          <motion.div
            key={alerta.id}
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: [0.05, 0.7, 0.1, 1] }}
            style={{
              background: alerta.tipo === 'suspension'
                ? 'linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)'
                : 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
              border: alerta.tipo === 'suspension' ? '1.5px solid #f59e0b' : '1.5px solid #0284c7',
              borderRadius: '16px',
              padding: '14px 18px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)'
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  background: alerta.tipo === 'suspension' ? '#f59e0b' : '#0284c7',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {alerta.tipo === 'suspension' ? <CloudLightning size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.73rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: alerta.tipo === 'suspension' ? '#b45309' : '#0369a1',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '999px'
                    }}
                  >
                    {alerta.colonia_nombre || 'Todas las Localidades'}
                  </span>
                  <strong style={{ color: '#78350f', fontSize: '0.96rem' }}>{alerta.titulo}</strong>
                </div>
                <p style={{ color: '#451a03', fontSize: '0.88rem', marginTop: '4px' }}>
                  {alerta.mensaje}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissedIds((prev) => [...prev, alerta.id])}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#78350f',
                padding: '4px'
              }}
              title="Ocultar aviso"
            >
              <X size={18} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
