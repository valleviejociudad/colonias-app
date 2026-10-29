import React from 'react';

export default function HeaderValleViejo({ compact = false, showTemporada = true, nroFicha = null, fecha = null, logoDeporteSrc = '/logodeporte.png' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '12px',
        width: '100%'
      }}
    >
      {/* Top institutional banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          background: 'linear-gradient(90deg, #0082a8 0%, #3aa6c9 52%, #ffffff 100%)',
          padding: compact ? '12px 18px' : '16px 24px',
          borderRadius: '12px',
          border: '1px solid #bae6fd'
        }}
      >
        {/* Left: Logo Deporte (Blanco sobre celeste institucional) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={logoDeporteSrc}
            alt="Deporte Valle Viejo"
            style={{
              height: compact ? '38px' : '46px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        {/* Right: Logo Valle Viejo Ciudad */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: compact ? '6px 12px' : '8px 16px',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
          }}
        >
          <img
            src="/logovalleviejociudad.png"
            alt="Valle Viejo Ciudad"
            style={{
              height: compact ? '34px' : '42px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>
      </div>

      {/* Subheader with Season & Ficha Number */}
      {showTemporada && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '6px 4px',
            borderBottom: '2px solid #006494'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
            🏖️ Colonia de Verano • Control de Salud Integral
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.88rem' }}>
            {fecha && (
              <span>
                <strong>Fecha:</strong> <span className="ficha-dotted-value">{fecha}</span>
              </span>
            )}
            {nroFicha && (
              <span>
                <strong>Nº de Ficha:</strong>{' '}
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 10px',
                    borderRadius: '999px',
                    fontWeight: 800
                  }}
                >
                  {nroFicha}
                </span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
