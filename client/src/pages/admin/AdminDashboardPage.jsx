import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search,
  Phone,
  MessageCircle,
  FileText,
  CloudLightning,
  HeartPulse,
  Plus,
  LogOut,
  Edit3,
  Trash2,
  ExternalLink,
  BarChart3,
  Images,
  ChevronDown,
  X,
  AlertCircle,
  SearchX,
  DatabaseBackup,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AlertaClimaticaBanner from '../../components/ui/AlertaClimaticaBanner';
import FichaMedicaVerticalView from '../../components/ficha/FichaMedicaVerticalView';
import EstadisticasPanel from '../../components/stats/EstadisticasPanel';
import GaleriaPanel from '../../components/galeria/GaleriaPanel';
import AvisosClimaPanel from '../../components/clima/AvisosClimaPanel';
import BackupsPanel from '../../components/backups/BackupsPanel';
import UsuariosPanel from '../../components/usuarios/UsuariosPanel';
import Hoja from '../../components/ui/Hoja';
import { API_BASE, asset } from '../../config';

const PATOLOGIAS_KEYS = [
  { key: 'alergias', label: 'Alergia' },
  { key: 'cardiacas', label: 'Cardíaca' },
  { key: 'rinones', label: 'Riñones' },
  { key: 'oncologicas', label: 'Oncológica' },
  { key: 'tiroides', label: 'Tiroides' },
  { key: 'asmas', label: 'Asma' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'neurologicas', label: 'Neurológica' },
  { key: 'oftalmologicas', label: 'Vista' },
  { key: 'auditivas', label: 'Oído' },
  { key: 'celiaquia', label: 'Celiaquía' },
  { key: 'discapacidad', label: 'Discapacidad' },
  { key: 'otras', label: 'Otra' }
];

// Color de carril por localidad: se mantiene igual en filtros, filas y tarjetas
// Sin celestes (se pierden en la banda de agua) ni los rojo/amarillo de las boyas ni los colores de estado.
const LANE_COLORS = ['#8b6fd6', '#f07f2c', '#2bb5a0', '#e05a9a', '#c9d64a', '#b07a4f', '#5a7bea', '#d4a5e8'];

const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const EASE_OUT = [0.23, 1, 0.32, 1];
const MotionLink = motion(Link);

export default function AdminDashboardPage() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState('fichas');
  const [inscripciones, setInscripciones] = useState([]);
  const [colonias, setColonias] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshBanner, setRefreshBanner] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColoniaFilter, setSelectedColoniaFilter] = useState('todas');
  // Filtro de Estadísticas: vive acá para no perderse al abrir una ficha y volver.
  const [statsColonia, setStatsColonia] = useState('todas');
  const scrollAlVolver = useRef(null);

  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [editModalFicha, setEditModalFicha] = useState(null);

  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  );
  const [expandedMobileCardId, setExpandedMobileCardId] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    // Se relee el media query también en "resize": algunos navegadores no avisan el cambio
    // (por ejemplo al rotar o redimensionar rápido) y quedaba la vista equivocada.
    const sync = () => setIsMobileView(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mediaQuery.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const [errorOperacion, setErrorOperacion] = useState(null);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      // Las fichas solo se piden si el usuario ve Fichas o Estadísticas (el servidor igual lo controla)
      const veFichas =
        user?.rol === 'admin' || (user?.permisos?.secciones || []).some((s) => s === 'fichas' || s === 'dashboard' || s === 'backups');
      const [resIns, resCol, resAle] = await Promise.all([
        veFichas ? authFetch(`${API_BASE}/inscripciones`) : null,
        authFetch(`${API_BASE}/colonias`),
        authFetch(`${API_BASE}/alertas`)
      ]);

      const [dataIns, dataCol, dataAle] = await Promise.all([resIns ? resIns.json() : [], resCol.json(), resAle.json()]);

      if (Array.isArray(dataIns)) setInscripciones(dataIns);
      if (Array.isArray(dataCol)) setColonias(dataCol);
      if (Array.isArray(dataAle)) setAlertas(dataAle);
    } catch (err) {
      if (err?.code === 'UNAUTHORIZED') {
        navigate('/login');
        return;
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') cargarTodo();
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const laneColor = useMemo(() => {
    const map = {};
    colonias.forEach((c, i) => {
      map[String(c.id)] = LANE_COLORS[i % LANE_COLORS.length];
    });
    return (id) => map[String(id)] || '#8aa5b2';
  }, [colonias]);

  const getPatologiasDeFicha = (item) =>
    PATOLOGIAS_KEYS.filter((p) => Number(item[`${p.key}_si`]) === 1).map((p) => ({
      label: p.label,
      detalle: item[`${p.key}_cual`]
    }));

  const fichasFiltradas = inscripciones.filter((item) => {
    if (selectedColoniaFilter !== 'todas' && String(item.colonia_id) !== String(selectedColoniaFilter)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(item.nino_nombre || '').toLowerCase().includes(q) ||
      String(item.nino_dni || '').toLowerCase().includes(q) ||
      String(item.padre_nombre || '').toLowerCase().includes(q) ||
      String(item.nro_ficha || '').toLowerCase().includes(q)
    );
  });

  const conteoPorColonia = useMemo(() => {
    const m = {};
    inscripciones.forEach((i) => {
      m[String(i.colonia_id)] = (m[String(i.colonia_id)] || 0) + 1;
    });
    return m;
  }, [inscripciones]);

  const handleEliminarFicha = async (id, nombre) => {
    if (!window.confirm(`¿Seguro que querés eliminar la ficha de ${nombre}? Esto no se puede deshacer.`)) return;
    try {
      setErrorOperacion(null);
      const res = await authFetch(`${API_BASE}/inscripciones/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorOperacion(data.error || `No se pudo eliminar la ficha de ${nombre}.`);
        return;
      }
      cargarTodo();
    } catch (err) {
      if (err.code === 'UNAUTHORIZED') {
        navigate('/login');
        return;
      }
      setErrorOperacion('No se pudo eliminar la ficha. Probá de nuevo.');
    }
  };

  const handleGuardarEdicionFicha = async (e) => {
    e.preventDefault();
    if (!editModalFicha) return;
    setErrorOperacion(null);
    try {
      const res = await authFetch(`${API_BASE}/inscripciones/${editModalFicha.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          firma_profesional_texto: editModalFicha.firma_profesional_texto,
          nino: {
            peso: editModalFicha.peso,
            talla: editModalFicha.talla,
            imc: editModalFicha.imc,
            presion_alta: editModalFicha.presion_alta,
            presion_baja: editModalFicha.presion_baja,
            presion_arterial:
              editModalFicha.presion_alta && editModalFicha.presion_baja
                ? `${editModalFicha.presion_alta}/${editModalFicha.presion_baja}`
                : editModalFicha.presion_arterial,
            circunferencia_cintura: editModalFicha.circunferencia_cintura,
            esquema_vacunacion: editModalFicha.esquema_vacunacion
          },
          medica: {
            observaciones: editModalFicha.observaciones,
            antecedentes_personales: editModalFicha.antecedentes_personales
          }
        })
      });
      if (res.ok) {
        setEditModalFicha(null);
        cargarTodo();
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorOperacion(data.error || 'No se pudieron guardar los cambios.');
      }
    } catch (err) {
      if (err.code === 'UNAUTHORIZED') {
        navigate('/login');
        return;
      }
      setErrorOperacion('No se pudo guardar la ficha. Probá de nuevo.');
    }
  };

  const esAdmin = user?.rol === 'admin';
  const permisos = esAdmin
    ? { secciones: ['fichas', 'dashboard', 'clima', 'galeria', 'backups'], editar_fichas: true, eliminar_fichas: true }
    : user?.permisos || { secciones: ['fichas'], editar_fichas: false, eliminar_fichas: false };
  // Backups y Usuarios solo se muestran en PC, nunca en el celular
  const puedeVerBackups = Boolean(permisos.secciones?.includes('backups')) && !isMobileView;
  const puedeVerUsuarios = esAdmin && !isMobileView;

  const navItems = [
    { id: 'fichas', label: 'Fichas médicas', shortLabel: 'Fichas', icon: HeartPulse },
    { id: 'dashboard', label: 'Estadísticas', shortLabel: 'Estadísticas', icon: BarChart3 },
    { id: 'clima', label: 'Avisos por clima', shortLabel: 'Avisos', icon: CloudLightning },
    { id: 'galeria', label: 'Banco de imágenes', shortLabel: 'Imágenes', icon: Images }
  ]
    .filter((item) => permisos.secciones?.includes(item.id))
    .concat(
      // Backups: con permiso y solo en PC. Usuarios: solo admin y solo en PC.
      puedeVerBackups ? [{ id: 'backups', label: 'Backups', shortLabel: 'Backups', icon: DatabaseBackup }] : [],
      puedeVerUsuarios ? [{ id: 'usuarios', label: 'Usuarios', shortLabel: 'Usuarios', icon: Users }] : []
    );
  const tabsPermitidas = navItems.map((n) => n.id).join(',');

  // Si la pestaña actual deja de estar permitida (cambio de permisos o ventana de celular), ir a la primera permitida
  useEffect(() => {
    const ids = tabsPermitidas.split(',').filter(Boolean);
    if (ids.length && !ids.includes(activeTab)) setActiveTab(ids[0]);
  }, [activeTab, tabsPermitidas]);

  const cambiarTab = (id) => {
    setFichaSeleccionada(null);
    setActiveTab(id);
    const sc = document.querySelector('.app-main-scroll');
    if (sc) sc.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };

  const tabActual = navItems.find((n) => n.id === activeTab);
  const hoy = capitalizar(new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }));

  const tabMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, ease: EASE_OUT }
      };

  const contactos = (item) => {
    const cleanPhone = String(item.padre_telefono || '').replace(/\D/g, '');
    const cleanWa = String(item.padre_whatsapp || item.padre_telefono || '').replace(/\D/g, '');
    const waNum = cleanWa.startsWith('54') ? cleanWa : `549${cleanWa}`;
    return { tel: `tel:${cleanPhone}`, wa: `https://wa.me/${waNum}` };
  };

  return (
    <div className="app-shell">
      {/* ==================== NAVEGACIÓN LATERAL (PC) ==================== */}
      <aside className="app-navigation-rail no-print">
        <div className="app-nav-header">
          <div className="logo-plate">
            <img src={asset('logocolonias.png')} alt="Colonias de Verano" style={{ height: 52, width: 'auto', display: 'block' }} />
          </div>
        </div>

        <nav className="app-nav-list" aria-label="Secciones del panel">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => cambiarTab(item.id)}
                className={`app-nav-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="nav-pill"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <Icon size={20} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="lane-divider app-nav-divider" />

          <Link to="/inscripcion" target="_blank" className="app-nav-item">
            <ExternalLink size={18} />
            <span>Ver formulario de padres</span>
          </Link>
        </nav>

        <div className="app-nav-footer">
          <div className="app-nav-user-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <div className="app-nav-avatar">{(user?.nombre || 'AD').substring(0, 2).toUpperCase()}</div>
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '0.95rem'
                  }}
                >
                  {user?.nombre}
                </div>
                <span className="role-badge">{esAdmin ? 'Administrador' : 'Usuario'}</span>
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== CONTENIDO ==================== */}
      <div className="app-main-content">
        <header className="app-top-bar no-print">
          {isMobileView ? (
            <>
              <div className="logo-row">
                <span className="plate">
                  <img src={asset('logocolonias.png')} alt="Colonias de Verano" style={{ height: 32, width: 'auto', display: 'block' }} />
                </span>
              </div>
              <div style={{ textAlign: 'right', minWidth: 0 }}>
                <div className="top-title" style={{ fontSize: '1.05rem' }}>
                  {fichaSeleccionada ? 'Ficha médica' : tabActual?.label}
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={() => {
                  if (window.confirm('¿Cerrar sesión?')) {
                    logout();
                    navigate('/login');
                  }
                }}
                aria-label="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <div>
                <div className="top-title">{fichaSeleccionada ? 'Ficha médica' : tabActual?.label}</div>
                <div className="top-sub">
                  {hoy}
                </div>
              </div>
              <div className="logo-row">
                <span className="plate">
                  <img src={asset('logodeporte.png')} alt="Deporte Valle Viejo" style={{ height: 30, width: 'auto', display: 'block' }} />
                </span>
                <span className="plate">
                  <img src={asset('logovalleviejociudad.png')} alt="Municipalidad de Valle Viejo" style={{ height: 30, width: 'auto', display: 'block' }} />
                </span>
              </div>
            </>
          )}
        </header>

        <main className="app-main-scroll">
          {activeTab !== 'clima' && <AlertaClimaticaBanner refreshTrigger={refreshBanner} />}

          {errorOperacion && (
            <div className="notice danger" role="alert" style={{ marginBottom: 14 }}>
              <AlertCircle size={20} />
              <span style={{ flex: 1 }}>{errorOperacion}</span>
              <button className="tool-btn danger" style={{ width: 36, height: 36 }} onClick={() => setErrorOperacion(null)} aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            </div>
          )}

          {fichaSeleccionada ? (
            <motion.div key="ficha" {...tabMotion}>
              <FichaMedicaVerticalView
                ficha={fichaSeleccionada}
                onBack={() => {
                  setFichaSeleccionada(null);
                  const y = scrollAlVolver.current;
                  scrollAlVolver.current = null;
                  if (y !== null) {
                    // Volver al mismo lugar de Estadísticas desde donde se abrió la ficha
                    setTimeout(() => {
                      const sc = document.querySelector('.app-main-scroll');
                      if (sc) sc.scrollTo({ top: y });
                      window.scrollTo({ top: y });
                    }, 60);
                  }
                }}
              />
            </motion.div>
          ) : (
            <>
              {navItems.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <DatabaseBackup size={30} />
                  </div>
                  <h3>No hay secciones para ver en el celular</h3>
                  <p>
                    {permisos.secciones?.includes('backups')
                      ? 'Tu usuario solo tiene acceso a Backups, que se usa desde una computadora.'
                      : 'Tu usuario no tiene secciones habilitadas. Pedile acceso a un administrador.'}
                  </p>
                </div>
              )}

              {/* ==================== FICHAS ==================== */}
              {activeTab === 'fichas' && permisos.secciones?.includes('fichas') && (
                <motion.div key="fichas" {...tabMotion}>
                  <section className="hero-banner" aria-label="Buscar fichas">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: 14,
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <h2 style={{ fontSize: isMobileView ? '1.3rem' : '1.6rem', fontWeight: 800 }}>
                          Buscar un niño o niña
                        </h2>
                        <p style={{ opacity: 0.92, marginTop: 2, fontSize: '0.98rem' }}>
                          {loading ? 'Cargando fichas…' : `${inscripciones.length} fichas cargadas en total`}
                        </p>
                      </div>
                      {!isMobileView && (
                        <Link to="/inscripcion" className="md3-btn" style={{ background: '#fff', color: 'var(--pool-ink)' }}>
                          <Plus size={18} /> Cargar nueva ficha
                        </Link>
                      )}
                    </div>

                    <div className="hero-search-bar">
                      <Search size={22} color="var(--pool)" style={{ flexShrink: 0 }} />
                      <input
                        type="search"
                        enterKeyHint="search"
                        aria-label="Buscar por nombre, DNI, tutor o número de ficha"
                        placeholder={isMobileView ? 'Nombre, DNI o Nº de ficha' : 'Escribí nombre del niño/a, DNI, nombre del tutor o Nº de ficha'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          className="tool-btn"
                          style={{ width: 36, height: 36, background: 'transparent' }}
                          onClick={() => setSearchQuery('')}
                          aria-label="Borrar búsqueda"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    <div
                      className={isMobileView ? 'hero-chips-mobile' : ''}
                      style={isMobileView ? { marginTop: 12 } : { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingBottom: 2 }}
                      role="group"
                      aria-label="Filtrar por localidad"
                    >
                      <button
                        onClick={() => setSelectedColoniaFilter('todas')}
                        className={`hero-chip ${selectedColoniaFilter === 'todas' ? 'active' : ''}`}
                        aria-pressed={selectedColoniaFilter === 'todas'}
                      >
                        Todas ({inscripciones.length})
                      </button>
                      {colonias.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedColoniaFilter(String(c.id))}
                          className={`hero-chip ${String(selectedColoniaFilter) === String(c.id) ? 'active' : ''}`}
                          aria-pressed={String(selectedColoniaFilter) === String(c.id)}
                        >
                          <span className="lane-swatch" style={{ background: laneColor(c.id) }} />
                          {c.nombre} ({conteoPorColonia[String(c.id)] || 0})
                        </button>
                      ))}
                    </div>
                  </section>

                  {(searchQuery || selectedColoniaFilter !== 'todas') && !loading && (
                    <p style={{ margin: '0 4px 10px', color: 'var(--ink-2)' }}>
                      {fichasFiltradas.length === 1 ? '1 resultado' : `${fichasFiltradas.length} resultados`}
                    </p>
                  )}

                  {loading && inscripciones.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: 72 }} />
                      ))}
                    </div>
                  ) : fichasFiltradas.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <SearchX size={30} />
                      </div>
                      <h3>{inscripciones.length === 0 ? 'Todavía no hay fichas' : 'No encontramos a nadie con esa búsqueda'}</h3>
                      <p>
                        {inscripciones.length === 0
                          ? 'Cuando las familias completen el formulario, las fichas aparecen acá.'
                          : 'Revisá cómo está escrito el nombre o probá con el DNI. También podés ver todas las localidades.'}
                      </p>
                      {(searchQuery || selectedColoniaFilter !== 'todas') && (
                        <button
                          className="md3-btn md3-btn-tonal"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedColoniaFilter('todas');
                          }}
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                    </div>
                  ) : isMobileView ? (
                    /* ----- Celular: tarjetas desplegables ----- */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {fichasFiltradas.map((item, idx) => {
                        const patologias = getPatologiasDeFicha(item);
                        const { tel, wa } = contactos(item);
                        const open = expandedMobileCardId === item.id;
                        return (
                          <motion.div
                            key={item.id}
                            className="medical-card"
                            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.26, ease: EASE_OUT, delay: Math.min(idx, 8) * 0.03 }}
                          >
                            <button
                              className="medical-card-head"
                              onClick={() => setExpandedMobileCardId(open ? null : item.id)}
                              aria-expanded={open}
                            >
                              <span
                                className={`health-mark ${patologias.length ? 'alert' : 'clear'}`}
                                title={patologias.length ? 'Tiene condiciones de salud' : 'Sin condiciones de salud'}
                              />
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span className="fichas-name" style={{ display: 'block' }}>
                                  {item.nino_nombre}
                                </span>
                                <span className="fichas-sub" style={{ display: 'block', marginTop: 2 }}>
                                  DNI {item.nino_dni} · {item.edad} años
                                </span>
                                <span className="lane-tag" style={{ marginTop: 2, fontWeight: 400 }}>
                                  <span className="lane-swatch" style={{ background: laneColor(item.colonia_id) }} />
                                  <span>{item.colonia_nombre}</span>
                                </span>
                              </span>
                              <span className={`chevron ${open ? 'open' : ''}`}>
                                <ChevronDown size={20} />
                              </span>
                            </button>

                            <AnimatePresence initial={false}>
                              {open && (
                                <motion.div
                                  key="body"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ height: { duration: 0.28, ease: EASE_OUT }, opacity: { duration: 0.18 } }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div className="medical-card-body">
                                    <div
                                      style={{
                                        borderTop: '1px solid var(--line)',
                                        paddingTop: 12,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '6px 14px',
                                        alignItems: 'center',
                                        color: 'var(--ink-2)',
                                        fontSize: '0.95rem'
                                      }}
                                    >
                                      <span className="ficha-badge">{item.nro_ficha}</span>
                                      <span>Obra social: {Number(item.tiene_obra_social) === 1 ? item.obra_social_nombre || 'Sí' : 'No'}</span>
                                    </div>

                                    {patologias.length > 0 ? (
                                      <div className="alert-chips">
                                        {patologias.map((p) => (
                                          <span key={p.label} className="alert-chip">
                                            {p.label}
                                            {p.detalle ? `: ${p.detalle}` : ''}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="clear-text">Sin condiciones de salud declaradas</span>
                                    )}

                                    <div style={{ fontSize: '0.95rem', color: 'var(--ink-2)' }}>
                                      Tutor: <strong style={{ color: 'var(--ink)' }}>{item.padre_nombre}</strong>
                                    </div>

                                    <div className="contact-grid">
                                      <a href={tel} className="md3-btn md3-btn-call">
                                        <Phone size={18} /> Llamar
                                      </a>
                                      <a href={wa} target="_blank" rel="noreferrer" className="md3-btn md3-btn-success">
                                        <MessageCircle size={18} /> WhatsApp
                                      </a>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                      <button
                                        onClick={() => setFichaSeleccionada(item)}
                                        className="md3-btn md3-btn-filled"
                                        style={{ flex: 1, borderRadius: 'var(--r-md)', minHeight: 48 }}
                                      >
                                        <FileText size={18} /> Ver ficha completa
                                      </button>
                                      {permisos.editar_fichas && (
                                        <button
                                          onClick={() => setEditModalFicha({ ...item })}
                                          className="tool-btn"
                                          style={{ width: 48, height: 48 }}
                                          aria-label="Editar control de salud"
                                        >
                                          <Edit3 size={18} />
                                        </button>
                                      )}
                                      {permisos.eliminar_fichas && (
                                        <button
                                          onClick={() => handleEliminarFicha(item.id, item.nino_nombre)}
                                          className="tool-btn danger"
                                          style={{ width: 48, height: 48 }}
                                          aria-label="Eliminar ficha"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ----- PC: tabla con columnas fijas ----- */
                    <div className="fichas-table" role="table" aria-label="Fichas médicas">
                      <div className="fichas-row head" role="row">
                        <span role="columnheader" aria-label="Estado de salud" />
                        <span role="columnheader">Niño / niña</span>
                        <span role="columnheader" className="col-nro">Nº de ficha</span>
                        <span role="columnheader">Localidad</span>
                        <span role="columnheader">Salud</span>
                        <span role="columnheader" style={{ textAlign: 'right' }}>
                          Acciones
                        </span>
                      </div>
                      {fichasFiltradas.map((item, idx) => {
                        const patologias = getPatologiasDeFicha(item);
                        const { tel, wa } = contactos(item);
                        return (
                          <motion.div
                            key={item.id}
                            className="fichas-row"
                            role="row"
                            initial={reduceMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.22, delay: Math.min(idx, 12) * 0.02 }}
                          >
                            <span role="cell">
                              <span
                                className={`health-mark ${patologias.length ? 'alert' : 'clear'}`}
                                title={patologias.length ? 'Tiene condiciones de salud' : 'Sin condiciones de salud'}
                              />
                            </span>
                            <span role="cell" style={{ minWidth: 0 }}>
                              <button
                                onClick={() => setFichaSeleccionada(item)}
                                className="fichas-name"
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', maxWidth: '100%', display: 'block' }}
                              >
                                {item.nino_nombre}
                              </button>
                              <span className="fichas-sub" style={{ display: 'block' }}>
                                DNI {item.nino_dni} · {item.edad} años
                              </span>
                              <span className="fichas-sub" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Tutor: {item.padre_nombre}
                              </span>
                            </span>
                            <span role="cell" className="col-nro">
                              <span className="ficha-badge">{item.nro_ficha}</span>
                            </span>
                            <span role="cell" className="lane-tag">
                              <span className="lane-swatch" style={{ background: laneColor(item.colonia_id) }} />
                              <span>{item.colonia_nombre}</span>
                            </span>
                            <span role="cell">
                              {patologias.length > 0 ? (
                                <span className="alert-chips">
                                  {patologias.slice(0, 3).map((p) => (
                                    <span key={p.label} className="alert-chip" title={p.detalle || p.label}>
                                      {p.label}
                                    </span>
                                  ))}
                                  {patologias.length > 3 && <span className="alert-chip">+{patologias.length - 3}</span>}
                                </span>
                              ) : (
                                <span className="clear-text">Sin condiciones</span>
                              )}
                            </span>
                            <span role="cell" className="fichas-actions">
                              <a href={tel} className="tool-btn call" title={`Llamar a ${item.padre_nombre}`} aria-label={`Llamar a ${item.padre_nombre}`}>
                                <Phone size={18} />
                              </a>
                              <a
                                href={wa}
                                target="_blank"
                                rel="noreferrer"
                                className="tool-btn wa"
                                title={`WhatsApp a ${item.padre_nombre}`}
                                aria-label={`WhatsApp a ${item.padre_nombre}`}
                              >
                                <MessageCircle size={18} />
                              </a>
                              <button
                                onClick={() => setFichaSeleccionada(item)}
                                className="tool-btn"
                                title="Ver ficha completa"
                                aria-label="Ver ficha completa"
                              >
                                <FileText size={18} />
                              </button>
                              {permisos.editar_fichas && (
                                <button
                                  onClick={() => setEditModalFicha({ ...item })}
                                  className="tool-btn"
                                  title="Editar control de salud"
                                  aria-label="Editar control de salud"
                                >
                                  <Edit3 size={18} />
                                </button>
                              )}
                              {permisos.eliminar_fichas && (
                                <button
                                  onClick={() => handleEliminarFicha(item.id, item.nino_nombre)}
                                  className="tool-btn danger"
                                  title="Eliminar ficha"
                                  aria-label="Eliminar ficha"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ==================== ESTADÍSTICAS ==================== */}
              {activeTab === 'dashboard' && permisos.secciones?.includes('dashboard') && (
                <motion.div key="dashboard" {...tabMotion}>
                  {loading && inscripciones.length === 0 ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div className="skeleton" style={{ height: 120 }} />
                      <div className="skeleton" style={{ height: 260 }} />
                    </div>
                  ) : (
                    <EstadisticasPanel
                      inscripciones={inscripciones}
                      colonias={colonias}
                      isMobileView={isMobileView}
                      localidad={statsColonia}
                      onLocalidadChange={setStatsColonia}
                      laneColor={laneColor}
                      onSelectFicha={(ficha) => {
                        const scActual = document.querySelector('.app-main-scroll');
                        scrollAlVolver.current = scActual && scActual.scrollTop > 0 ? scActual.scrollTop : window.scrollY;
                        setFichaSeleccionada(ficha);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        const sc = document.querySelector('.app-main-scroll');
                        if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  )}
                </motion.div>
              )}

              {/* ==================== AVISOS POR CLIMA ==================== */}
              {activeTab === 'clima' && permisos.secciones?.includes('clima') && (
                <motion.div key="clima" {...tabMotion}>
                  <AvisosClimaPanel
                    esAdmin={esAdmin}
                    colonias={colonias}
                    alertas={alertas}
                    authFetch={authFetch}
                    onCambio={() => {
                      cargarTodo();
                      setRefreshBanner((p) => p + 1);
                    }}
                    onUnauthorized={() => navigate('/login')}
                  />
                </motion.div>
              )}

              {/* ==================== BACKUPS ==================== */}
              {activeTab === 'backups' && puedeVerBackups && (
                <motion.div key="backups" {...tabMotion}>
                  {loading && inscripciones.length === 0 ? (
                    <div className="skeleton" style={{ height: 220 }} />
                  ) : (
                    <BackupsPanel
                      inscripciones={inscripciones}
                      colonias={colonias}
                      laneColor={laneColor}
                      authFetch={authFetch}
                      user={user}
                      isMobileView={isMobileView}
                      onUnauthorized={() => navigate('/login')}
                    />
                  )}
                </motion.div>
              )}

              {/* ==================== USUARIOS ==================== */}
              {activeTab === 'usuarios' && puedeVerUsuarios && (
                <motion.div key="usuarios" {...tabMotion}>
                  <UsuariosPanel
                    authFetch={authFetch}
                    user={user}
                    isMobileView={isMobileView}
                    onUnauthorized={() => navigate('/login')}
                  />
                </motion.div>
              )}

              {/* ==================== BANCO DE IMÁGENES ==================== */}
              {activeTab === 'galeria' && permisos.secciones?.includes('galeria') && (
                <motion.div key="galeria" {...tabMotion}>
                  <GaleriaPanel colonias={colonias} isMobileView={isMobileView} />
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ==================== BOTÓN FLOTANTE (celular) ==================== */}
      <AnimatePresence>
        {isMobileView && activeTab === 'fichas' && !fichaSeleccionada && expandedMobileCardId === null && (
          <MotionLink
            key="fab"
            to="/inscripcion"
            className="mobile-fab no-print"
            aria-label="Cargar nueva ficha"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <Plus size={22} strokeWidth={2.5} />
            <span>Nueva ficha</span>
          </MotionLink>
        )}
      </AnimatePresence>

      {/* ==================== NAVEGACIÓN INFERIOR (celular) ==================== */}
      <nav className="app-bottom-nav no-print" aria-label="Secciones del panel">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => cambiarTab(item.id)}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="bottom-nav-pill">
                {active && (
                  <motion.span
                    layoutId="bottom-pill"
                    className="pill-bg"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.38, bounce: 0.15 }}
                  />
                )}
                <Icon size={22} />
              </span>
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* ==================== EDITAR CONTROL DE SALUD ==================== */}
      <Hoja open={Boolean(editModalFicha)} onClose={() => setEditModalFicha(null)} isMobile={isMobileView} maxWidth={560}>
        {editModalFicha && (
          <>
            <h3 style={{ fontSize: '1.3rem' }}>Control de salud</h3>
            <p style={{ color: 'var(--ink-2)', margin: '4px 0 16px' }}>
              {editModalFicha.nino_nombre} · Ficha {editModalFicha.nro_ficha}
            </p>
            <form onSubmit={handleGuardarEdicionFicha}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                {[
                  ['peso', 'Peso (kg)'],
                  ['talla', 'Altura (cm)'],
                  ['presion_alta', 'Presión alta'],
                  ['presion_baja', 'Presión baja']
                ].map(([k, label]) => (
                  <div className="md3-field" key={k}>
                    <label className="md3-label" htmlFor={`ed-${k}`}>
                      {label}
                    </label>
                    <input
                      id={`ed-${k}`}
                      type="text"
                      inputMode="decimal"
                      className="md3-input"
                      value={editModalFicha[k] || ''}
                      onChange={(e) => setEditModalFicha({ ...editModalFicha, [k]: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              <div className="md3-field">
                <label className="md3-label" htmlFor="ed-obs">
                  Observaciones e indicaciones de urgencia
                </label>
                <textarea
                  id="ed-obs"
                  rows={3}
                  className="md3-textarea"
                  value={editModalFicha.observaciones || ''}
                  onChange={(e) => setEditModalFicha({ ...editModalFicha, observaciones: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label" htmlFor="ed-firma">
                  Firma y sello del profesional
                </label>
                <input
                  id="ed-firma"
                  type="text"
                  className="md3-input"
                  placeholder="Ejemplo: Dr. Roberto Juárez · MP 1842"
                  value={editModalFicha.firma_profesional_texto || ''}
                  onChange={(e) => setEditModalFicha({ ...editModalFicha, firma_profesional_texto: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                <button type="button" className="md3-btn md3-btn-outlined" onClick={() => setEditModalFicha(null)}>
                  Cancelar
                </button>
                <button type="submit" className="md3-btn md3-btn-filled">
                  Guardar cambios
                </button>
              </div>
            </form>
          </>
        )}
      </Hoja>
    </div>
  );
}
