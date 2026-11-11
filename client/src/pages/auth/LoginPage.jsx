import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Mail, Lock, LogIn } from 'lucide-react';
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
          {/* Campo Email */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Correo electrónico *
            </span>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--md-sys-color-on-surface-variant)', pointerEvents: 'none' }} />
              <input
                type="email"
                value={email}
                required
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--md-sys-color-outline)',
                  fontSize: '1rem',
                  background: 'var(--md-sys-color-surface)',
                  color: 'var(--md-sys-color-on-surface)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--md-sys-color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--md-sys-color-outline)'}
              />
            </div>
          </label>

          {/* Campo Contraseña */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)' }}>
              Contraseña *
            </span>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--md-sys-color-on-surface-variant)', pointerEvents: 'none' }} />
              <input
                type="password"
                value={password}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 14px 12px 42px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--md-sys-color-outline)',
                  fontSize: '1rem',
                  background: 'var(--md-sys-color-surface)',
                  color: 'var(--md-sys-color-on-surface)',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--md-sys-color-primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--md-sys-color-outline)'}
              />
            </div>
          </label>

          {/* Botón submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '24px',
              border: 'none',
              background: loading ? 'var(--md-sys-color-outline)' : 'var(--md-sys-color-primary)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s, opacity 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            <LogIn size={18} />
            {loading ? 'Ingresando...' : 'Ingresar al Panel'}
          </button>
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
