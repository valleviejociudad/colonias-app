import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HeaderValleViejo from '../../components/ui/HeaderValleViejo';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(20px + env(safe-area-inset-top, 0px)) 14px calc(20px + env(safe-area-inset-bottom, 0px))',
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

    </div>
  );
}
