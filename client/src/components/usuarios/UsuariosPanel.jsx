import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Edit3, Trash2, Check, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { API_BASE } from '../../config';
import Hoja from '../ui/Hoja';

// Secciones de la barra lateral que se pueden dar a un usuario. Usuarios es siempre solo de admin.
export const SECCIONES_USUARIO = [
  { id: 'fichas', label: 'Fichas médicas', sub: 'Buscar niños/as, ver fichas y llamar a las familias.' },
  { id: 'dashboard', label: 'Estadísticas', sub: 'Resumen de inscriptos y condiciones de salud.' },
  { id: 'clima', label: 'Avisos por clima', sub: 'Publicar avisos y suspender actividades.' },
  { id: 'galeria', label: 'Banco de imágenes', sub: 'Subir y ver fotos de las colonias.' },
  {
    id: 'backups',
    label: 'Backups',
    sub: 'Descargar las fichas en Excel y en PDF. Solo en PC. El backup completo de la base queda solo para administradores.'
  }
];

const PERMISOS_NUEVO = { secciones: ['fichas', 'dashboard'], editar_fichas: false, eliminar_fichas: false };
const FORM_VACIO = { id: null, nombre: '', email: '', password: '', rol: 'coordinador', permisos: PERMISOS_NUEVO };

function resumenPermisos(u) {
  if (u.rol === 'admin') return ['Acceso total'];
  const p = u.permisos || {};
  const chips = SECCIONES_USUARIO.filter((s) => p.secciones?.includes(s.id)).map((s) => s.label);
  if (p.secciones?.includes('fichas')) {
    if (p.editar_fichas && p.eliminar_fichas) chips.push('Edita y elimina fichas');
    else if (p.editar_fichas) chips.push('Edita fichas');
    else if (p.eliminar_fichas) chips.push('Elimina fichas');
    else chips.push('Fichas solo lectura');
  }
  return chips;
}

function Opcion({ checked, onChange, disabled, label, sub, tipo = 'checkbox', name }) {
  return (
    <label className={`gf-option${disabled ? ' is-disabled' : ''}`}>
      <input type={tipo} name={name} checked={checked} disabled={disabled} onChange={onChange} />
      {tipo === 'radio' ? (
        <span className="dot" />
      ) : (
        <span className="box">
          <Check size={16} strokeWidth={3} />
        </span>
      )}
      <span className="opt-main">
        <span>{label}</span>
        {sub && <span className="opt-sub">{sub}</span>}
      </span>
    </label>
  );
}

export default function UsuariosPanel({ authFetch, user, isMobileView, onUnauthorized }) {
  const [usuarios, setUsuarios] = useState(null);
  const [errorLista, setErrorLista] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [form, setForm] = useState(null); // null = cerrado
  const [errorForm, setErrorForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const manejar = (err, set, mensaje) => {
    if (err?.code === 'UNAUTHORIZED') return onUnauthorized();
    set(mensaje);
  };

  const cargar = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/auth/usuarios`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la lista de usuarios.');
      setUsuarios(data);
      setErrorLista(null);
    } catch (err) {
      manejar(err, setErrorLista, err.message || 'No se pudo cargar la lista de usuarios.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authFetch]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setAviso(null);
    setErrorForm(null);
    setVerPassword(false);
    setForm({ ...FORM_VACIO, permisos: { ...PERMISOS_NUEVO, secciones: [...PERMISOS_NUEVO.secciones] } });
  };

  const abrirEditar = (u) => {
    setAviso(null);
    setErrorForm(null);
    setVerPassword(false);
    setForm({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol,
      permisos: u.rol === 'admin' ? { ...PERMISOS_NUEVO, secciones: [...PERMISOS_NUEVO.secciones] } : { ...u.permisos, secciones: [...(u.permisos?.secciones || [])] }
    });
  };

  const toggleSeccion = (id) => {
    const secciones = form.permisos.secciones.includes(id)
      ? form.permisos.secciones.filter((s) => s !== id)
      : [...form.permisos.secciones, id];
    const permisos = { ...form.permisos, secciones };
    // Sin la sección Fichas no tiene sentido editar ni eliminar fichas
    if (!secciones.includes('fichas')) {
      permisos.editar_fichas = false;
      permisos.eliminar_fichas = false;
    }
    setForm({ ...form, permisos });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErrorForm(null);
    if (form.rol !== 'admin' && form.permisos.secciones.length === 0) {
      setErrorForm('Elegí al menos una sección que pueda ver.');
      return;
    }
    setGuardando(true);
    try {
      const body = {
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        permisos: form.rol === 'admin' ? undefined : form.permisos,
        ...(form.password ? { password: form.password } : {})
      };
      const res = await authFetch(form.id ? `${API_BASE}/auth/usuarios/${form.id}` : `${API_BASE}/auth/usuarios`, {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorForm(data.error || 'No se pudo guardar el usuario.');
        return;
      }
      setAviso(form.id ? `Listo: se guardaron los cambios de ${data.nombre}.` : `Listo: ${data.nombre} ya puede entrar con ${data.email}.`);
      setForm(null);
      cargar();
    } catch (err) {
      manejar(err, setErrorForm, 'No se pudo guardar el usuario. Probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.nombre} (${u.email})? Ya no va a poder entrar al panel. Esto no se puede deshacer.`)) return;
    setAviso(null);
    setErrorLista(null);
    try {
      const res = await authFetch(`${API_BASE}/auth/usuarios/${u.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorLista(data.error || 'No se pudo eliminar el usuario.');
        return;
      }
      setAviso(`Se eliminó a ${u.nombre}.`);
      cargar();
    } catch (err) {
      manejar(err, setErrorLista, 'No se pudo eliminar el usuario. Probá de nuevo.');
    }
  };

  const esYo = (u) => Number(u.id) === Number(user?.id);
  const fichasActiva = form?.permisos?.secciones?.includes('fichas');

  return (
    <div className="usuarios">
      <section className="hero-banner stats-banner usuarios-banner" aria-label="Usuarios del panel" style={{ marginBottom: 0 }}>
        <div>
          <h2 style={{ fontSize: isMobileView ? '1.3rem' : '1.6rem', fontWeight: 800 }}>Usuarios del panel</h2>
          <p>Quién puede entrar, qué secciones ve y qué puede hacer con las fichas.</p>
        </div>
        <button className="md3-btn" style={{ background: '#fff', color: 'var(--pool-ink)' }} onClick={abrirNuevo}>
          <UserPlus size={18} /> Nuevo usuario
        </button>
      </section>

      {errorLista && (
        <div className="notice danger" role="alert">
          <AlertCircle size={20} />
          <span>{errorLista}</span>
        </div>
      )}
      {aviso && (
        <div className="notice ok" role="status">
          <CheckCircle2 size={20} />
          <span>{aviso}</span>
        </div>
      )}

      {usuarios === null && !errorLista ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 76 }} />
          ))}
        </div>
      ) : (
        <ul className="usuarios-lista">
          {(usuarios || []).map((u) => (
            <li key={u.id} className="usuario-row">
              <div className="usuario-avatar" aria-hidden="true">
                {u.nombre.substring(0, 2).toUpperCase()}
              </div>
              <div className="usuario-info">
                <div className="usuario-nombre">
                  {u.nombre}
                  {esYo(u) && <span className="usuario-yo">Vos</span>}
                </div>
                <div className="usuario-email">{u.email}</div>
                <div className="usuario-chips">
                  {u.rol === 'admin' && (
                    <span className="usuario-chip is-admin">
                      <ShieldCheck size={14} /> Administrador
                    </span>
                  )}
                  {resumenPermisos(u).map((c) => (
                    <span key={c} className="usuario-chip">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="usuario-acciones">
                <button className="tool-btn" onClick={() => abrirEditar(u)} title="Editar usuario" aria-label={`Editar a ${u.nombre}`}>
                  <Edit3 size={18} />
                </button>
                <button
                  className="tool-btn danger"
                  onClick={() => eliminar(u)}
                  disabled={esYo(u)}
                  title={esYo(u) ? 'No podés eliminar tu propio usuario' : 'Eliminar usuario'}
                  aria-label={`Eliminar a ${u.nombre}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ==================== ALTA / EDICIÓN ==================== */}
      <Hoja open={Boolean(form)} onClose={() => !guardando && setForm(null)} isMobile={isMobileView} maxWidth={600}>
        {form && (
          <form onSubmit={guardar} noValidate>
            <h3 style={{ fontSize: '1.3rem' }}>{form.id ? 'Editar usuario' : 'Nuevo usuario'}</h3>
            <p style={{ color: 'var(--ink-2)', margin: '4px 0 16px' }}>
              {form.id ? 'Los cambios valen enseguida, aunque la persona ya tenga la sesión abierta.' : 'Con el correo y la contraseña entra al panel.'}
            </p>

            <div className="md3-field">
              <label className="md3-label" htmlFor="us-nombre">
                Nombre
              </label>
              <input
                id="us-nombre"
                className="md3-input"
                maxLength={80}
                autoComplete="off"
                placeholder="Ejemplo: Laura Díaz · Coordinación Las Tejas"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>

            <div className="md3-field">
              <label className="md3-label" htmlFor="us-email">
                Correo
              </label>
              <input
                id="us-email"
                type="email"
                className="md3-input"
                maxLength={120}
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="md3-field">
              <label className="md3-label" htmlFor="us-pass">
                {form.id ? 'Nueva contraseña' : 'Contraseña'}
              </label>
              <div className="usuario-pass">
                <input
                  id="us-pass"
                  type={verPassword ? 'text' : 'password'}
                  className="md3-input"
                  maxLength={100}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="tool-btn"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="field-hint">
                {form.id ? 'Dejala vacía para no cambiarla. ' : ''}Mínimo 8 caracteres. Pasásela a la persona en mano o por un medio seguro.
              </span>
            </div>

            <fieldset className="clima-fieldset">
              <legend className="md3-label">Tipo de acceso</legend>
              <div className="gf-options">
                <Opcion
                  tipo="radio"
                  name="us-rol"
                  checked={form.rol !== 'admin'}
                  onChange={() => setForm({ ...form, rol: 'coordinador' })}
                  label="Usuario con permisos"
                  sub="Ve solo las secciones que elijas abajo."
                />
                <Opcion
                  tipo="radio"
                  name="us-rol"
                  checked={form.rol === 'admin'}
                  onChange={() => setForm({ ...form, rol: 'admin' })}
                  label="Administrador"
                  sub="Acceso total, incluidos Backups y Usuarios."
                />
              </div>
            </fieldset>

            {form.rol !== 'admin' && (
              <>
                <fieldset className="clima-fieldset">
                  <legend className="md3-label">Qué ve en la barra lateral</legend>
                  <div className="gf-options">
                    {SECCIONES_USUARIO.map((s) => (
                      <Opcion
                        key={s.id}
                        checked={form.permisos.secciones.includes(s.id)}
                        onChange={() => toggleSeccion(s.id)}
                        label={s.label}
                        sub={s.sub}
                      />
                    ))}
                  </div>
                </fieldset>

                <fieldset className="clima-fieldset">
                  <legend className="md3-label">Qué puede hacer con las fichas médicas</legend>
                  {!fichasActiva && <span className="field-hint">Activá “Fichas médicas” para dar estos permisos.</span>}
                  <div className="gf-options">
                    <Opcion
                      checked={form.permisos.editar_fichas}
                      disabled={!fichasActiva}
                      onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, editar_fichas: e.target.checked } })}
                      label="Editar fichas"
                      sub="Cargar el control de salud: peso, altura, presión, observaciones y firma."
                    />
                    <Opcion
                      checked={form.permisos.eliminar_fichas}
                      disabled={!fichasActiva}
                      onChange={(e) => setForm({ ...form, permisos: { ...form.permisos, eliminar_fichas: e.target.checked } })}
                      label="Eliminar fichas"
                      sub="Borrar una inscripción. No se puede deshacer."
                    />
                  </div>
                </fieldset>
              </>
            )}

            {errorForm && (
              <div className="notice danger" role="alert" style={{ marginBottom: 12 }}>
                <AlertCircle size={20} />
                <span>{errorForm}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="md3-btn md3-btn-outlined" onClick={() => setForm(null)} disabled={guardando}>
                Cancelar
              </button>
              <button type="submit" className="md3-btn md3-btn-filled" disabled={guardando}>
                {guardando && <Loader2 size={18} className="spin" />}
                {form.id ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>
        )}
      </Hoja>
    </div>
  );
}
