import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Phone,
  MessageCircle,
  FileText,
  CloudLightning,
  Users,
  HeartPulse,
  Plus,
  Copy,
  Check,
  LogOut,
  Smartphone,
  Edit3,
  Trash2,
  Send,
  Mail,
  ExternalLink,
  BarChart3,
  Images,
  ChevronDown,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HeaderValleViejo from '../../components/ui/HeaderValleViejo';
import AlertaClimaticaBanner from '../../components/ui/AlertaClimaticaBanner';
import FichaMedicaVerticalView from '../../components/ficha/FichaMedicaVerticalView';
import EstadisticasPanel from '../../components/stats/EstadisticasPanel';
import GaleriaPanel from '../../components/galeria/GaleriaPanel';

const PATOLOGIAS_KEYS = [
  { key: 'alergias', label: 'Alergia' },
  { key: 'cardiacas', label: 'Cardíaca' },
  { key: 'rinones', label: 'Riñones' },
  { key: 'oncologicas', label: 'Oncológica' },
  { key: 'tiroides', label: 'Tiroides' },
  { key: 'asmas', label: 'Asma' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'neurologicas', label: 'Neurológica' },
  { key: 'oftalmologicas', label: 'Oftalmológica' },
  { key: 'auditivas', label: 'Auditiva' },
  { key: 'celiaquia', label: 'Celiaquía' },
  { key: 'discapacidad', label: 'Discapacidad' },
  { key: 'otras', label: 'Otra' }
];

export default function AdminDashboardPage() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('fichas'); // 'fichas' | 'dashboard' | 'clima'
  const [inscripciones, setInscripciones] = useState([]);
  const [colonias, setColonias] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshBanner, setRefreshBanner] = useState(0);

  // Search & Filter states for Emergency Medical Finder
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColoniaFilter, setSelectedColoniaFilter] = useState('todas');

  // Selected medical record for full vertical view or edit
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [editModalFicha, setEditModalFicha] = useState(null);

  // Mobile compact vertical list & accordion expansion state
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  );
  const [expandedMobileCardId, setExpandedMobileCardId] = useState(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 900px)');
    const handleResize = (e) => setIsMobileView(e.matches);
    setIsMobileView(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  // Weather / Suspension Broadcast state
  const [alertaForm, setAlertaForm] = useState({
    colonia_id: '',
    tipo: 'suspension',
    titulo: 'Suspensión de Colonia por Mal Clima / Lluvia',
    mensaje:
      'Informamos a las familias que por razones climáticas y para resguardar la seguridad de los niños/as, hoy se suspenden las actividades de la colonia de verano.',
    suspender_colonia: true,
    enviar_email: true
  });
  const [difusionResultado, setDifusionResultado] = useState(null);
  const [enviandoDifusion, setEnviandoDifusion] = useState(false);

  // PWA Install Prompt & Link Copy
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [resIns, resCol, resEst, resAle] = await Promise.all([
        authFetch('/api/inscripciones'),
        authFetch('/api/colonias'),
        authFetch('/api/estadisticas'),
        authFetch('/api/alertas')
      ]);

      if (resIns.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      const [dataIns, dataCol, dataEst, dataAle] = await Promise.all([
        resIns.json(),
        resCol.json(),
        resEst.json(),
        resAle.json()
      ]);

      if (Array.isArray(dataIns)) setInscripciones(dataIns);
      if (Array.isArray(dataCol)) setColonias(dataCol);
      if (dataEst) setEstadisticas(dataEst);
      if (Array.isArray(dataAle)) setAlertas(dataAle);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const handleCopyPublicLink = () => {
    const url = window.location.origin + '/inscripcion';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowPwaGuide(true);
    }
  };

  // Helper to list active conditions for a child
  const getPatologiasDeFicha = (item) => {
    return PATOLOGIAS_KEYS.filter((p) => Number(item[`${p.key}_si`]) === 1).map((p) => ({
      label: p.label,
      detalle: item[`${p.key}_cual`]
    }));
  };

  // Filtered medical records
  const fichasFiltradas = inscripciones.filter((item) => {
    if (selectedColoniaFilter !== 'todas' && String(item.colonia_id) !== String(selectedColoniaFilter)) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(item.nino_nombre || '').toLowerCase().includes(q) ||
      String(item.nino_dni || '').toLowerCase().includes(q) ||
      String(item.padre_nombre || '').toLowerCase().includes(q) ||
      String(item.nro_ficha || '').toLowerCase().includes(q)
    );
  });

  const handleEliminarFicha = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar la ficha médica de ${nombre}?`)) return;
    await authFetch(`/api/inscripciones/${id}`, { method: 'DELETE' });
    cargarTodo();
  };

  const handleGuardarEdicionFicha = async (e) => {
    e.preventDefault();
    if (!editModalFicha) return;
    const res = await authFetch(`/api/inscripciones/${editModalFicha.id}`, {
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
    }
  };

  const handleEnviarDifusion = async (e) => {
    e.preventDefault();
    setEnviandoDifusion(true);
    try {
      const res = await authFetch('/api/alertas', {
        method: 'POST',
        body: JSON.stringify({
          ...alertaForm,
          colonia_id: alertaForm.colonia_id ? Number(alertaForm.colonia_id) : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDifusionResultado(data);
        cargarTodo();
        setRefreshBanner((p) => p + 1);
      }
    } finally {
      setEnviandoDifusion(false);
    }
  };

  const handleDesactivarAlerta = async (id) => {
    await authFetch(`/api/alertas/${id}/desactivar`, { method: 'PUT' });
    cargarTodo();
    setRefreshBanner((p) => p + 1);
  };

  const navItems = [
    { id: 'fichas', label: 'Fichas Médicas', shortLabel: 'Fichas', icon: HeartPulse },
    { id: 'dashboard', label: 'Estadísticas', shortLabel: 'Estadísticas', icon: BarChart3 },
    { id: 'clima', label: 'Clima & Alertas', shortLabel: 'Clima', icon: CloudLightning },
    { id: 'galeria', label: 'Banco de Imágenes', shortLabel: 'Imágenes', icon: Images }
  ];

  return (
    <div className="app-shell">
      {/* ==================== NAVIGATION DRAWER (Material Design 3) ==================== */}
      <aside className="app-navigation-rail no-print">
        {/* Header con logo institucional */}
        <div className="app-nav-header" style={{ justifyContent: 'center' }}>
          <img
            src="/logocolonias.png"
            alt="Colonias de Verano"
            style={{ height: '52px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* Navigation List */}
        <nav className="app-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setFichaSeleccionada(null);
                  setActiveTab(item.id);
                }}
                className={`app-nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={20} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="app-nav-divider" />

          <Link
            to="/inscripcion"
            target="_blank"
            className="app-nav-item"
            style={{ color: 'var(--md-sys-color-primary)' }}
          >
            <ExternalLink size={18} />
            <span>Ver Formulario Padres</span>
          </Link>
        </nav>

        {/* User Footer */}
        <div className="app-nav-footer">
          <div className="app-nav-user-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div className="app-nav-avatar">
                {(user?.nombre || 'AD').substring(0, 2).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.nombre}
                </div>
                <span className="role-badge">{user?.rol}</span>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{
                background: 'var(--md-sys-color-error-container)',
                color: 'var(--md-sys-color-on-error-container)',
                border: 'none',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="app-main-content">
        {/* Top App Bar */}
        <header
          className="app-top-bar no-print"
          style={isMobileView ? { justifyContent: 'center' } : undefined}
        >
          {/* Logos institucionales — centrados en mobile, izquierda en desktop */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <img
              src="/logodeporte.png"
              alt="Deporte Valle Viejo"
              style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <div style={{ width: '1px', height: '28px', background: 'var(--md-sys-color-outline-variant)' }} />
            <img
              src={isMobileView ? '/logocolonias.png' : '/logovalleviejociudad.png'}
              alt={isMobileView ? 'Colonias de Verano' : 'Valle Viejo Ciudad'}
              style={{ height: isMobileView ? '38px' : '34px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="app-main-scroll">
          {/* Active Weather / Suspension Alert Banner */}
          <AlertaClimaticaBanner refreshTrigger={refreshBanner} />

        {/* If a single medical sheet is selected, show the Vertical Official Planilla */}
        {fichaSeleccionada ? (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FichaMedicaVerticalView
              ficha={fichaSeleccionada}
              onBack={() => setFichaSeleccionada(null)}
            />
          </motion.div>
        ) : (
          <>
            {/* ==================== TAB 1: BUSCADOR DE URGENCIAS Y FICHAS MÉDICAS ==================== */}
            {activeTab === 'fichas' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Hero Search & Emergency Filter Banner */}
                <div className="hero-banner">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: isMobileView ? 'nowrap' : 'wrap',
                      gap: isMobileView ? '8px' : '12px',
                      marginBottom: isMobileView ? '12px' : '18px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isMobileView ? 'space-between' : 'flex-start',
                        gap: isMobileView ? '8px' : '12px',
                        width: isMobileView ? '100%' : 'auto'
                      }}
                    >
                      <h2
                        className="font-display"
                        style={{
                          fontSize: isMobileView ? '1.14rem' : '1.5rem',
                          fontWeight: 800,
                          color: '#fff',
                          lineHeight: 1.2
                        }}
                      >
                        Fichas Médicas Digitales
                      </h2>
                      <span
                        style={{
                          padding: isMobileView ? '4px 10px' : '4px 12px',
                          background: 'rgba(255,255,255,0.2)',
                          borderRadius: '999px',
                          fontSize: isMobileView ? '0.74rem' : '0.8rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        {fichasFiltradas.length} registradas
                      </span>
                    </div>
                    {!isMobileView && (
                      <Link
                        to="/inscripcion"
                        className="md3-btn"
                        style={{ background: '#ffffff', color: 'var(--md-sys-color-primary)', fontWeight: 700, fontSize: '0.86rem' }}
                      >
                        <Plus size={16} /> Cargar Nueva Ficha
                      </Link>
                    )}
                  </div>

                  {/* Instant Search Bar */}
                  <div
                    className="hero-search-bar"
                    style={
                      isMobileView
                        ? {
                            height: '46px',
                            borderRadius: '14px',
                            padding: '0 14px',
                            boxShadow: '0 2px 8px rgba(0, 30, 48, 0.14)'
                          }
                        : undefined
                    }
                  >
                    <Search size={isMobileView ? 18 : 20} color="var(--md-sys-color-primary)" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder={
                        isMobileView
                          ? 'Buscar por nombre, DNI o Nº ficha...'
                          : 'Buscar rápido por Nombre del Niño/a, DNI, Apellido del Padre o Nº de Ficha...'
                      }
                      style={isMobileView ? { fontSize: '0.88rem' } : undefined}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Filter Chips */}
                  {isMobileView ? (
                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(255,255,255,0.18)'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'rgba(255,255,255,0.85)',
                          marginBottom: '6px'
                        }}
                      >
                        Filtrar por localidad
                      </div>
                      <div className="hero-chips-mobile">
                        <button
                          onClick={() => setSelectedColoniaFilter('todas')}
                          className={`hero-chip ${selectedColoniaFilter === 'todas' ? 'active' : ''}`}
                        >
                          <Users size={13} />
                          Todas ({inscripciones.length})
                        </button>
                        {colonias.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedColoniaFilter(String(c.id))}
                            className={`hero-chip ${String(selectedColoniaFilter) === String(c.id) ? 'active' : ''}`}
                          >
                            {c.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                      <button
                        onClick={() => setSelectedColoniaFilter('todas')}
                        className={`hero-chip ${selectedColoniaFilter === 'todas' ? 'active' : ''}`}
                      >
                        <Users size={14} />
                        Todas las Localidades ({inscripciones.length})
                      </button>
                      {colonias.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedColoniaFilter(String(c.id))}
                          className={`hero-chip ${String(selectedColoniaFilter) === String(c.id) ? 'active' : ''}`}
                        >
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Medical Cards Grid */}
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Cargando fichas médicas...
                  </div>
                ) : fichasFiltradas.length === 0 ? (
                  <div className="gf-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ fontSize: '1.05rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                      No se encontraron niños/as con ese criterio de búsqueda.
                    </p>
                  </div>
                ) : (
                  <div
                    style={
                      isMobileView
                        ? { display: 'flex', flexDirection: 'column', gap: '10px' }
                        : {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                            gap: '16px'
                          }
                    }
                  >
                    {fichasFiltradas.map((item) => {
                      const patologias = getPatologiasDeFicha(item);
                      const cleanPhone = String(item.padre_telefono || '').replace(/\D/g, '');
                      const cleanWa = String(item.padre_whatsapp || item.padre_telefono || '').replace(/\D/g, '');
                      const waNum = cleanWa.startsWith('54') ? cleanWa : `549${cleanWa}`;
                      const isMobileExpanded = expandedMobileCardId === item.id;

                      // Unified Mobile Accordion Card (smooth height/opacity reveal without FLIP scale distortion)
                      if (isMobileView) {
                        return (
                          <div
                            key={item.id}
                            className={`medical-card ${patologias.length > 0 ? 'has-alert' : 'no-alert'}`}
                          >
                            {/* Stable Clickable Header */}
                            <div
                              onClick={() => setExpandedMobileCardId(isMobileExpanded ? null : item.id)}
                              style={{
                                padding: '13px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    className="font-display"
                                    style={{
                                      fontSize: '0.98rem',
                                      fontWeight: 800,
                                      color: 'var(--md-sys-color-on-surface)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}
                                  >
                                    {item.nino_nombre}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--md-sys-color-on-surface-variant)',
                                    marginTop: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                  }}
                                >
                                  <span><strong>DNI:</strong> {item.nino_dni}</span>
                                  <span>•</span>
                                  <span style={{ color: 'var(--md-sys-color-primary)', fontWeight: 600 }}>{item.colonia_nombre}</span>
                                </div>
                              </div>

                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '999px',
                                  background: isMobileExpanded
                                    ? 'var(--md-sys-color-primary-container)'
                                    : 'var(--md-sys-color-surface-container)',
                                  color: 'var(--md-sys-color-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  transform: isMobileExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.24s cubic-bezier(0.2, 0, 0, 1), background-color 0.2s ease'
                                }}
                              >
                                <ChevronDown size={18} />
                              </div>
                            </div>

                            {/* Smooth Accordion Body */}
                            <AnimatePresence initial={false}>
                              {isMobileExpanded && (
                                <motion.div
                                  key="mobile-accordion-content"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    height: { duration: 0.24, ease: [0.2, 0, 0, 1] },
                                    opacity: { duration: 0.18, ease: 'easeOut' }
                                  }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div
                                    style={{
                                      padding: '0 14px 14px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '10px'
                                    }}
                                  >
                                    <div
                                      style={{
                                        paddingTop: '10px',
                                        borderTop: '1px solid var(--md-sys-color-outline-variant)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '8px',
                                        fontSize: '0.8rem',
                                        color: 'var(--md-sys-color-on-surface-variant)'
                                      }}
                                    >
                                      <span className="ficha-badge">{item.nro_ficha}</span>
                                      <span><strong>Edad:</strong> {item.edad} años</span>
                                      <span>•</span>
                                      <span><strong>O. Social:</strong> {Number(item.tiene_obra_social) === 1 ? item.obra_social_nombre : 'No'}</span>
                                    </div>

                                    {/* Row 1: Direct Contact (Call & WhatsApp) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                      <a
                                        href={`tel:${cleanPhone}`}
                                        className="md3-btn md3-btn-call"
                                        style={{ height: '38px', padding: '0 12px', fontSize: '0.82rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
                                        title="Llamar por teléfono al padre/tutor"
                                      >
                                        <Phone size={15} /> Llamar
                                      </a>
                                      <a
                                        href={`https://wa.me/${waNum}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="md3-btn md3-btn-success"
                                        style={{ height: '38px', padding: '0 12px', fontSize: '0.82rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
                                        title="Enviar WhatsApp al padre/tutor"
                                      >
                                        <MessageCircle size={15} /> WhatsApp
                                      </a>
                                    </div>

                                    {/* Row 2: Medical Sheet & Admin Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button
                                        onClick={() => setFichaSeleccionada(item)}
                                        className="md3-btn md3-btn-filled"
                                        style={{ flex: 1, height: '40px', padding: '0 14px', fontSize: '0.84rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
                                      >
                                        <FileText size={16} /> Ver Ficha / PDF
                                      </button>
                                      <button
                                        onClick={() => setEditModalFicha({ ...item })}
                                        className="md3-btn md3-btn-tonal"
                                        style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px', flexShrink: 0 }}
                                        title="Editar datos clínicos / Firmar"
                                      >
                                        <Edit3 size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleEliminarFicha(item.id, item.nino_nombre)}
                                        className="md3-btn md3-btn-danger"
                                        style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px', flexShrink: 0 }}
                                        title="Eliminar ficha"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      }

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                          className={`medical-card ${patologias.length > 0 ? 'has-alert' : 'no-alert'}`}
                        >
                          {/* Card Body */}
                          <div className="medical-card-body">
                            {/* Header row: Nro ficha + Colonia */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px'
                              }}
                            >
                              <span className="ficha-badge">{item.nro_ficha}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '0.74rem', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 600 }}>
                                  📍 {item.colonia_nombre}
                                </span>
                              </div>
                            </div>

                            {/* Child name & details */}
                            <div>
                              <h3
                                className="font-display"
                                style={{
                                  fontSize: '1.12rem',
                                  fontWeight: 800,
                                  color: 'var(--md-sys-color-on-surface)'
                                }}
                              >
                                {item.nino_nombre}
                              </h3>
                              <div style={{ fontSize: '0.82rem', color: 'var(--md-sys-color-on-surface-variant)', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                <span><strong>DNI:</strong> {item.nino_dni}</span>
                                <span><strong>Edad:</strong> {item.edad} años</span>
                                <span><strong>O. Social:</strong> {Number(item.tiene_obra_social) === 1 ? item.obra_social_nombre : 'No'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer — Action buttons */}
                          <div className="medical-card-footer">
                            {/* Row 1: Direct Contact (Call & WhatsApp) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="md3-btn md3-btn-call"
                                style={{ height: '38px', padding: '0 12px', fontSize: '0.82rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
                                title="Llamar por teléfono al padre/tutor"
                              >
                                <Phone size={15} /> Llamar
                              </a>
                              <a
                                href={`https://wa.me/${waNum}`}
                                target="_blank"
                                rel="noreferrer"
                                className="md3-btn md3-btn-success"
                                style={{ height: '38px', padding: '0 12px', fontSize: '0.82rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
                                title="Enviar WhatsApp al padre/tutor"
                              >
                                <MessageCircle size={15} /> WhatsApp
                              </a>
                            </div>

                            {/* Row 2: Medical Sheet & Admin Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => setFichaSeleccionada(item)}
                                className="md3-btn md3-btn-filled"
                                style={{ flex: 1, height: '40px', padding: '0 14px', fontSize: '0.84rem', borderRadius: '12px', whiteSpace: 'nowrap' }}
                              >
                                <FileText size={16} /> Ver Ficha / PDF
                              </button>
                              <button
                                onClick={() => setEditModalFicha({ ...item })}
                                className="md3-btn md3-btn-tonal"
                                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px', flexShrink: 0 }}
                                title="Editar datos clínicos / Firmar"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleEliminarFicha(item.id, item.nino_nombre)}
                                className="md3-btn md3-btn-danger"
                                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '12px', flexShrink: 0 }}
                                title="Eliminar ficha"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ==================== TAB 2: ESTADÍSTICAS ==================== */}
            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {loading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Calculando estadísticas e indicadores...
                  </div>
                ) : (
                  <EstadisticasPanel
                    inscripciones={inscripciones}
                    colonias={colonias}
                    isMobileView={isMobileView}
                    onSelectFicha={(ficha) => {
                      setFichaSeleccionada(ficha);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      const scrollContainer = document.querySelector('.app-main-scroll');
                      if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                )}
              </motion.div>
            )}

            {/* ==================== TAB 3: DIFUSIÓN DE SUSPENSIONES POR CLIMA (EMAIL + WHATSAPP) ==================== */}
            {activeTab === 'clima' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
                  {/* Broadcast Form */}
                  <div className="gf-card">
                    <div className="gf-card-section-bar" style={{ background: '#fff3cd', color: '#78350f' }}>
                      <CloudLightning size={16} /> Emitir Alerta por Clima o Fuerza Mayor
                    </div>
                    <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
                      Difusión Oficial a Padres y Tutores
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: '#475569', marginBottom: '16px' }}>
                      Publicá un aviso inmediato en la web/app, enviá un correo automático a todos los padres inscriptos y obtené la lista de envío directo por WhatsApp (`wa.me`).
                    </p>

                    <form onSubmit={handleEnviarDifusion}>
                      <div className="md3-field">
                        <label className="md3-label">Colonia / Localidad afectada</label>
                        <select
                          className="md3-select"
                          value={alertaForm.colonia_id}
                          onChange={(e) => setAlertaForm({ ...alertaForm, colonia_id: e.target.value })}
                        >
                          <option value="">🌩️ TODAS LAS LOCALIDADES MUNICIPALES</option>
                          {colonias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} ({c.sede})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md3-field">
                        <label className="md3-label">Título del Comunicado</label>
                        <input
                          type="text"
                          className="md3-input"
                          value={alertaForm.titulo}
                          onChange={(e) => setAlertaForm({ ...alertaForm, titulo: e.target.value })}
                          required
                        />
                      </div>

                      <div className="md3-field">
                        <label className="md3-label">Mensaje detallado para los Padres</label>
                        <textarea
                          rows="4"
                          className="md3-textarea"
                          value={alertaForm.mensaje}
                          onChange={(e) => setAlertaForm({ ...alertaForm, mensaje: e.target.value })}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={alertaForm.suspender_colonia}
                            onChange={(e) => setAlertaForm({ ...alertaForm, suspender_colonia: e.target.checked })}
                            style={{ transform: 'scale(1.2)', accentColor: '#006494' }}
                          />
                          <span>Marcar localidad(es) como <strong>Suspendida por hoy</strong> en el banner público</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={alertaForm.enviar_email}
                            onChange={(e) => setAlertaForm({ ...alertaForm, enviar_email: e.target.checked })}
                            style={{ transform: 'scale(1.2)', accentColor: '#006494' }}
                          />
                          <span>Enviar <strong>Email automático</strong> a todos los padres inscriptos</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="md3-btn md3-btn-filled"
                        style={{ width: '100%', background: '#b45309' }}
                        disabled={enviandoDifusion}
                      >
                        <Send size={18} />
                        {enviandoDifusion
                          ? 'Enviando Emails y Generando WhatsApp...'
                          : 'Publicar Alerta + Enviar Emails + Generar WhatsApp'}
                      </button>
                    </form>
                  </div>

                  {/* WhatsApp & Email Results + History */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {difusionResultado && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="gf-card"
                        style={{ border: '2px solid #128c7e' }}
                      >
                        <h3 className="font-display" style={{ fontSize: '1.15rem', color: '#0f172a' }}>
                          ✅ ¡Comunicado Emitido! ({difusionResultado.whatsappLinks?.length || 0} familias alcanzadas)
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                          <Mail size={14} style={{ verticalAlign: 'middle' }} /> Correos procesados:{' '}
                          <strong>{difusionResultado.emailResult?.enviados || 0}</strong>.
                          {difusionResultado.emailResult?.previewUrl && (
                            <>
                              {' '}
                              <a
                                href={difusionResultado.emailResult.previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#006494', fontWeight: 700 }}
                              >
                                Ver vista previa del Email enviado ↗
                              </a>
                            </>
                          )}
                        </p>

                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#128c7e', marginBottom: '8px' }}>
                            📲 Envío rápido de WhatsApp a cada Padre/Tutor (Sin Meta API):
                          </div>
                          <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {difusionResultado.whatsappLinks?.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  background: '#f8fafc',
                                  borderRadius: '10px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.82rem'
                                }}
                              >
                                <div>
                                  <strong>{item.padre_nombre}</strong> (Tutor de {item.nino_nombre})
                                  <div style={{ color: '#64748b', fontSize: '0.76rem' }}>Tel: {item.telefono}</div>
                                </div>
                                <a
                                  href={item.wa_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="md3-btn md3-btn-success"
                                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                >
                                  <MessageCircle size={14} /> Enviar WhatsApp
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="gf-card">
                      <h3 className="font-display" style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
                        Historial de Alertas y Suspensiones
                      </h3>
                      {alertas.length === 0 ? (
                        <p style={{ fontSize: '0.86rem', color: '#64748b' }}>
                          No hay alertas climáticas emitidas recientemente.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {alertas.map((al) => (
                            <div
                              key={al.id}
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: al.activa ? '#fffbeb' : '#f8fafc',
                                border: al.activa ? '1px solid #f59e0b' : '1px solid #e2e8f0'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ fontSize: '0.92rem' }}>{al.titulo}</strong>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: al.activa ? '#f59e0b' : '#cbd5e1',
                                    color: al.activa ? '#fff' : '#334155'
                                  }}
                                >
                                  {al.activa ? 'ACTIVA EN WEB' : 'FINALIZADA'}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                                {al.mensaje}
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.76rem', color: '#64748b' }}>
                                <span>Localidad: {al.colonia_nombre || 'Todas'} • {al.created_at}</span>
                                {al.activa === 1 && (
                                  <button
                                    onClick={() => handleDesactivarAlerta(al.id)}
                                    className="md3-btn md3-btn-outlined"
                                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                                  >
                                    Levantar Suspensión
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ==================== TAB 4: BANCO DE IMÁGENES ==================== */}
            {activeTab === 'galeria' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <GaleriaPanel colonias={colonias} isMobileView={isMobileView} />
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Status Bar */}
      <footer className="app-status-bar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#22C55E', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span>Sistema activo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Colonias de Verano • Municipalidad de Valle Viejo</span>
        </div>
      </footer>
      </div>

      {/* ==================== MOBILE FLOATING ACTION BUTTON (Cargar Nueva Ficha) ==================== */}
      {isMobileView && activeTab === 'fichas' && !fichaSeleccionada && (
        <Link
          to="/inscripcion"
          className="mobile-fab no-print"
          aria-label="Cargar Nueva Ficha"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Cargar Nueva Ficha</span>
        </Link>
      )}

      {/* ==================== MOBILE BOTTOM NAVIGATION BAR (PWA App Feel) ==================== */}
      <nav className="app-bottom-nav no-print">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setFichaSeleccionada(null);
                setActiveTab(item.id);
              }}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
            >
              <div className="bottom-nav-pill">
                <Icon size={20} />
              </div>
              <span>{item.shortLabel || item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* ==================== MODAL: EDITAR DATOS CLÍNICOS / FIRMA PROFESIONAL ==================== */}
      {editModalFicha && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100
          }}
          onClick={() => setEditModalFicha(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gf-card"
            style={{ maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>
              Actualizar Control de Salud: {editModalFicha.nino_nombre}
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '14px' }}>
              Ficha Nº {editModalFicha.nro_ficha} • DNI {editModalFicha.nino_dni}
            </p>
            <form onSubmit={handleGuardarEdicionFicha}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                <div className="md3-field">
                  <label className="md3-label">Peso (kg)</label>
                  <input
                    type="text"
                    className="md3-input"
                    value={editModalFicha.peso || ''}
                    onChange={(e) => setEditModalFicha({ ...editModalFicha, peso: e.target.value })}
                  />
                </div>
                <div className="md3-field">
                  <label className="md3-label">Talla (cm)</label>
                  <input
                    type="text"
                    className="md3-input"
                    value={editModalFicha.talla || ''}
                    onChange={(e) => setEditModalFicha({ ...editModalFicha, talla: e.target.value })}
                  />
                </div>
                <div className="md3-field">
                  <label className="md3-label">Presión Alta</label>
                  <input
                    type="text"
                    className="md3-input"
                    value={editModalFicha.presion_alta || ''}
                    onChange={(e) => setEditModalFicha({ ...editModalFicha, presion_alta: e.target.value })}
                  />
                </div>
                <div className="md3-field">
                  <label className="md3-label">Presión Baja</label>
                  <input
                    type="text"
                    className="md3-input"
                    value={editModalFicha.presion_baja || ''}
                    onChange={(e) => setEditModalFicha({ ...editModalFicha, presion_baja: e.target.value })}
                  />
                </div>
              </div>

              <div className="md3-field">
                <label className="md3-label">Observaciones Médicas / Indicaciones de Urgencia</label>
                <textarea
                  rows="3"
                  className="md3-textarea"
                  value={editModalFicha.observaciones || ''}
                  onChange={(e) => setEditModalFicha({ ...editModalFicha, observaciones: e.target.value })}
                />
              </div>

              <div className="md3-field">
                <label className="md3-label">Firma y Sello del Profesional de la Salud</label>
                <input
                  type="text"
                  className="md3-input"
                  placeholder="Ej: Dr. Roberto Juárez - MP 1842"
                  value={editModalFicha.firma_profesional_texto || ''}
                  onChange={(e) =>
                    setEditModalFicha({ ...editModalFicha, firma_profesional_texto: e.target.value })
                  }
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button type="button" className="md3-btn md3-btn-outlined" onClick={() => setEditModalFicha(null)}>
                  Cancelar
                </button>
                <button type="submit" className="md3-btn md3-btn-filled">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ==================== MODAL: GUÍA INSTALACIÓN PWA ANDROID & iOS ==================== */}
      {showPwaGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100
          }}
          onClick={() => setShowPwaGuide(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="gf-card"
            style={{ maxWidth: '460px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display" style={{ fontSize: '1.25rem', marginBottom: '10px' }}>
              📱 Instalar App "Colonias de Verano"
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '14px' }}>
              Esta plataforma es una <strong>PWA (Progressive Web App)</strong> oficial. Podés instalarla en tu celular Android o iPhone sin pasar por la tienda de aplicaciones:
            </p>
            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '12px', marginBottom: '10px', fontSize: '0.85rem' }}>
              <strong>🤖 En Android (Chrome):</strong>
              <p style={{ marginTop: '4px' }}>
                Tocá el menú de 3 puntos <strong>(⋮)</strong> arriba a la derecha y elegí <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
              <strong>🍏 En iPhone / iPad (Safari):</strong>
              <p style={{ marginTop: '4px' }}>
                Tocá el botón <strong>Compartir (⬆️)</strong> en la barra inferior de Safari y seleccioná <strong>"Agregar a inicio"</strong>.
              </p>
            </div>
            <button className="md3-btn md3-btn-filled" style={{ width: '100%' }} onClick={() => setShowPwaGuide(false)}>
              ¡Entendido!
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
