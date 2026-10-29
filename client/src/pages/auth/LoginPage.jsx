import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HeaderValleViejo from '../../components/ui/HeaderValleViejo';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@valleviejo.gob.ar');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAccountSelect = async (acc) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(acc);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowGoogleModal(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 14px',
        background: 'linear-gradient(145deg, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-background) 55%, var(--md-sys-color-secondary-container) 100%)'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.05, 0.7, 0.1, 1] }}
        className="gf-card"
        style={{ maxWidth: '460px', width: '100%', padding: '28px 26px' }}
      >
        <div className="gf-card-header-bar" />

        <HeaderValleViejo compact={true} showTemporada={false} />

        <div style={{ textAlign: 'center', margin: '18px 0 20px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
              fontSize: '0.76rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 'var(--md-sys-shape-corner-full)',
              marginBottom: '8px'
            }}
          >
            <Shield size={14} /> PANEL DE GESTIÓN Y GUARDIA MÉDICA
          </span>
          <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>
            Colonias de Verano
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px' }}>
            Acceso para Administradores y Coordinadores Municipales
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: 'var(--md-sys-color-error-container)',
              color: 'var(--md-sys-color-on-error-container)',
              padding: '10px 14px',
              borderRadius: 'var(--md-sys-shape-corner-medium)',
              fontSize: '0.86rem',
              fontWeight: 600,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* MD3 Outlined Text Field — Email */}
          <md-outlined-text-field
            label="Correo electrónico"
            type="email"
            value={email}
            required
            style={{ width: '100%' }}
            onInput={(e) => setEmail(e.target.value)}
          >
            <md-icon slot="leading-icon">mail</md-icon>
          </md-outlined-text-field>

          {/* MD3 Outlined Text Field — Password */}
          <md-outlined-text-field
            label="Contraseña"
            type="password"
            value={password}
            required
            style={{ width: '100%' }}
            onInput={(e) => setPassword(e.target.value)}
          >
            <md-icon slot="leading-icon">lock</md-icon>
          </md-outlined-text-field>

          {/* MD3 Filled Button — Submit */}
          <md-filled-button
            type="submit"
            style={{ width: '100%', '--md-filled-button-container-height': '48px' }}
            disabled={loading || undefined}
          >
            {loading ? (
              <>
                <md-circular-progress indeterminate style={{ '--md-circular-progress-size': '20px', '--md-circular-progress-active-indicator-color': '#ffffff' }} slot="icon" />
                Ingresando...
              </>
            ) : (
              <>
                <md-icon slot="icon">login</md-icon>
                Ingresar al Panel
              </>
            )}
          </md-filled-button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '16px 0',
            color: 'var(--md-sys-color-outline)',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <md-divider style={{ flex: 1 }} />
          <span>O INGRESAR CON</span>
          <md-divider style={{ flex: 1 }} />
        </div>

        {/* MD3 Outlined Button — Google Login */}
        <md-outlined-button
          type="button"
          onClick={() => setShowGoogleModal(true)}
          style={{
            width: '100%',
            '--md-outlined-button-container-height': '48px',
            '--md-outlined-button-label-text-color': 'var(--md-sys-color-on-surface)',
            '--md-outlined-button-outline-color': 'var(--md-sys-color-outline-variant)'
          }}
        >
          <svg slot="icon" width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continuar con cuenta de Google
        </md-outlined-button>

        {/* Quick Demo Credentials */}
        <div
          style={{
            marginTop: '18px',
            background: 'var(--md-sys-color-surface-container-low)',
            borderRadius: 'var(--md-sys-shape-corner-medium)',
            padding: '14px',
            border: '1px solid var(--md-sys-color-outline-variant)',
            fontSize: '0.8rem'
          }}
        >
          <div style={{
            fontWeight: 700,
            color: 'var(--md-sys-color-primary)',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={14} /> Acceso rápido de prueba local:
          </div>
          <md-chip-set style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <md-suggestion-chip
              label="👤 Administrador"
              onClick={() => {
                setEmail('admin@valleviejo.gob.ar');
                setPassword('admin123');
              }}
            />
            <md-suggestion-chip
              label="🏃 Coordinador"
              onClick={() => {
                setEmail('coordinador@valleviejo.gob.ar');
                setPassword('coord123');
              }}
            />
          </md-chip-set>
        </div>

        <div style={{ marginTop: '18px', textAlign: 'center' }}>
          <Link
            to="/inscripcion"
            style={{
              fontSize: '0.86rem',
              color: 'var(--md-sys-color-primary)',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={15} /> Ir al Formulario Público de Padres
          </Link>
        </div>
      </motion.div>

      {/* Google Account Picker Modal — usa md-dialog */}
      {showGoogleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100
          }}
          onClick={() => setShowGoogleModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'var(--md-sys-color-surface-container-high)',
              borderRadius: 'var(--md-sys-shape-corner-extra-large)',
              maxWidth: '400px',
              width: '100%',
              padding: '24px',
              boxShadow: 'var(--md-sys-elevation-3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--md-sys-color-on-surface)' }}>
              Seleccioná una cuenta de Google
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '16px' }}>
              Para continuar a <strong>Colonias de Verano Valle Viejo</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                {
                  acc: { email: 'admin@valleviejo.gob.ar', nombre: 'Subsecretaría de Deportes (Admin)', googleId: 'google_admin_vv' },
                  label: 'Subsecretaría de Deportes',
                  sub: 'admin@valleviejo.gob.ar',
                  initial: 'A',
                  color: 'var(--md-sys-color-primary)'
                },
                {
                  acc: { email: 'coordinador@valleviejo.gob.ar', nombre: 'Coordinación General Colonias', googleId: 'google_coord_vv' },
                  label: 'Coordinación General',
                  sub: 'coordinador@valleviejo.gob.ar',
                  initial: 'C',
                  color: 'var(--md-sys-color-tertiary)'
                }
              ].map((item) => (
                <button
                  key={item.acc.email}
                  type="button"
                  onClick={() => handleGoogleAccountSelect(item.acc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--md-sys-shape-corner-large)',
                    border: '1px solid var(--md-sys-color-outline-variant)',
                    background: 'var(--md-sys-color-surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--md-sys-color-surface-container-low)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--md-sys-color-surface)'}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--md-sys-shape-corner-full)',
                      background: item.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      flexShrink: 0
                    }}
                  >
                    {item.initial}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--md-sys-color-on-surface)' }}>{item.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant)' }}>{item.sub}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <md-text-button onClick={() => setShowGoogleModal(false)}>
                Cancelar
              </md-text-button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
