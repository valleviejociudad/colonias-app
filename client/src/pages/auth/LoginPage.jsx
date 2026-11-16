import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Loader2, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { asset } from '../../config';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
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
      setError(err.message || 'No pudimos ingresar. Revisá el correo y la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="gf-water login-water">
        <div className="gf-water-logos">
          <span className="logo-chip"><img src={asset('logodeporte.png')} alt="Deporte Valle Viejo" /></span>
          <span className="logo-chip">
            <img src={asset('logovalleviejociudad.png')} alt="Municipalidad de Valle Viejo" />
          </span>
        </div>
      </div>

      <motion.main
        className="gf-card gf-title-card login-card"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      >
        <img src={asset('logocolonias.png')} alt="Colonias de Verano" className="login-logo" />
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, textAlign: 'center' }}>Panel de coordinación</h1>
        <p style={{ textAlign: 'center', color: 'var(--ink-2)', marginTop: 6 }}>
          Ingresá con tu correo y contraseña municipal.
        </p>

        <div className="lane-divider" style={{ margin: '20px 0' }} />

        {error && (
          <motion.div
            className="notice danger"
            role="alert"
            style={{ marginBottom: 16 }}
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="md3-field">
            <label className="md3-label" htmlFor="login-email">
              Correo electrónico
            </label>
            <input
              id="login-email"
              className="md3-input"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              enterKeyHint="next"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="md3-field">
            <label className="md3-label" htmlFor="login-pass">
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-pass"
                className="md3-input"
                style={{ paddingRight: 52 }}
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                enterKeyHint="go"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {verPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="md3-btn md3-btn-filled md3-btn-big" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
            {loading ? <Loader2 size={20} className="spin" /> : <LogIn size={20} />}
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <Link to="/inscripcion" className="md3-btn md3-btn-text">
            <ArrowLeft size={18} /> Ir al formulario de inscripción
          </Link>
        </div>
      </motion.main>
    </div>
  );
}
