import React, { useMemo, useState } from 'react';
import {
  Users,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Syringe,
  FileCheck2,
  MapPin,
  Activity,
  PieChart as PieChartIcon,
  Table2,
  UserCheck
} from 'lucide-react';

const PATOLOGIAS_META = [
  { key: 'alergias', label: 'Alergias' },
  { key: 'asmas', label: 'Asma / Broncoespasmo' },
  { key: 'oftalmologicas', label: 'Oftalmológicas' },
  { key: 'celiaquia', label: 'Celiaquía (Sin TACC)' },
  { key: 'discapacidad', label: 'Discapacidad' },
  { key: 'cardiacas', label: 'Cardíacas' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'neurologicas', label: 'Neurológicas' },
  { key: 'auditivas', label: 'Auditivas' },
  { key: 'rinones', label: 'Renales / Riñones' },
  { key: 'tiroides', label: 'Tiroides' },
  { key: 'oncologicas', label: 'Oncológicas' },
  { key: 'otras', label: 'Otras condiciones' }
];

const CHART_PALETTE = [
  '#006494',
  '#0082a8',
  '#006c4c',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#475569'
];

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Gráfico Circular (Donut SVG) nítido y adaptable para Mobile y Desktop
 */
function DonutChartCard({ title, subtitle, centerValue, centerLabel, segments, isMobile }) {
  const size = isMobile ? 116 : 132;
  const strokeWidth = isMobile ? 15 : 17;
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 2;
  const circumference = 2 * Math.PI * radius;

  const activeSegments = segments.filter((s) => s.value > 0);
  const total = activeSegments.reduce((acc, s) => acc + s.value, 0);
  const gapPx = activeSegments.length > 1 ? 2.2 : 0;

  let accumulated = 0;

  return (
    <div
      className="gf-card"
      style={{
        padding: isMobile ? '16px 14px' : '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--md-sys-color-primary)'
          }}
        >
          <PieChartIcon size={14} />
          <span>{subtitle}</span>
        </div>
        <h3
          className="font-display"
          style={{
            fontSize: isMobile ? '1.02rem' : '1.08rem',
            fontWeight: 800,
            color: 'var(--md-sys-color-on-surface)',
            marginTop: '2px'
          }}
        >
          {title}
        </h3>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '14px' : '18px',
          flexWrap: 'nowrap'
        }}
      >
        {/* SVG Donut */}
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {total > 0 && (
              <g transform={`rotate(-90 ${center} ${center})`}>
                {activeSegments.map((seg, idx) => {
                  const rawLen = (seg.value / total) * circumference;
                  const visibleLen = Math.max(0, rawLen - gapPx);
                  const offset = -accumulated;
                  accumulated += rawLen;
                  return (
                    <circle
                      key={idx}
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${visibleLen} ${circumference}`}
                      strokeDashoffset={offset}
                      strokeLinecap="butt"
                    />
                  );
                })}
              </g>
            )}
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '0 10px',
              pointerEvents: 'none'
            }}
          >
            <span
              className="font-display"
              style={{
                fontSize: isMobile ? '1.15rem' : '1.28rem',
                fontWeight: 800,
                lineHeight: 1.05,
                color: 'var(--md-sys-color-on-surface)'
              }}
            >
              {centerValue}
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 600,
                color: 'var(--md-sys-color-on-surface-variant)',
                marginTop: '2px',
                lineHeight: 1.15
              }}
            >
              {centerLabel}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {segments.map((seg, idx) => {
            const p = pct(seg.value, total || 1);
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: isMobile ? '0.79rem' : '0.82rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '3px',
                      background: seg.color,
                      flexShrink: 0
                    }}
                  />
                  <span
                    style={{
                      color: 'var(--md-sys-color-on-surface)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={seg.label}
                  >
                    {seg.label}
                  </span>
                </div>
                <span
                  style={{
                    fontWeight: 800,
                    color: 'var(--md-sys-color-on-surface)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  {seg.value}{' '}
                  <span style={{ fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.73rem' }}>
                    ({total > 0 ? p : 0}%)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EstadisticasPanel({
  inscripciones = [],
  colonias = [],
  isMobileView = false,
  onSelectFicha
}) {
  const [localidadFilter, setLocalidadFilter] = useState('todas');
  const [soloPatologiasActivas, setSoloPatologiasActivas] = useState(false);

  const datosFiltrados = useMemo(() => {
    if (localidadFilter === 'todas') return inscripciones;
    return inscripciones.filter((i) => String(i.colonia_id) === String(localidadFilter));
  }, [inscripciones, localidadFilter]);

  const stats = useMemo(() => {
    const total = datosFiltrados.length;

    let sinPatologia = 0;
    let conUnaPatologia = 0;
    let conMultiplesPatologias = 0;
    let conObraSocial = 0;
    let autorizados = 0;
    let conFirmaMedica = 0;
    let conAntropometria = 0;
    let enAtencionMedica = 0;
    let vacunacionCompleta = 0;

    const edades = [];
    const pesos = [];
    const tallas = [];
    const imcs = [];
    const cinturas = [];

    const obrasSocialesMap = {};
    const parentescoMap = {};
    const rangosEdad = [
      { label: '5 a 7 años', sub: 'Inicial', min: 0, max: 7, count: 0, color: '#0ea5e9' },
      { label: '8 a 10 años', sub: 'Intermedio', min: 8, max: 10, count: 0, color: '#006494' },
      { label: '11 a 13 años', sub: 'Mayor', min: 11, max: 13, count: 0, color: '#006c4c' },
      { label: '14+ años', sub: 'Adolescentes', min: 14, max: 99, count: 0, color: '#7c3aed' }
    ];

    const patologiasDetalle = PATOLOGIAS_META.map((pm) => ({
      ...pm,
      count: 0,
      afectados: []
    }));

    datosFiltrados.forEach((item) => {
      // Patologías por niño
      let cantPatsNino = 0;
      patologiasDetalle.forEach((pd) => {
        if (Number(item[`${pd.key}_si`]) === 1) {
          cantPatsNino++;
          pd.count++;
          pd.afectados.push({
            ficha: item,
            nombre: item.nino_nombre,
            detalle: item[`${pd.key}_cual`] || 'Declarada'
          });
        }
      });

      if (cantPatsNino === 0) sinPatologia++;
      else if (cantPatsNino === 1) conUnaPatologia++;
      else conMultiplesPatologias++;

      // Obra Social
      if (Number(item.tiene_obra_social) === 1) {
        conObraSocial++;
        const osRaw = String(item.obra_social_nombre || 'Otra Obra Social').trim();
        const osKey = osRaw || 'Otra Obra Social';
        obrasSocialesMap[osKey] = (obrasSocialesMap[osKey] || 0) + 1;
      }

      // Autorización & Firmas & Vacunación
      if (Number(item.autorizado) === 1) autorizados++;
      const tieneFirma = Boolean(String(item.firma_profesional_texto || '').trim());
      if (tieneFirma) conFirmaMedica++;

      const tieneDatosFisicos = Boolean(
        parseNumber(item.peso) ||
          parseNumber(item.talla) ||
          String(item.presion_arterial || item.presion_alta || item.presion_baja || '').trim()
      );
      if (tieneDatosFisicos) conAntropometria++;

      if (Number(item.recibe_atencion_medica) === 1) enAtencionMedica++;

      const vac = String(item.esquema_vacunacion || '').toLowerCase();
      if (!vac || vac.includes('completo') || vac.includes('calendario') || vac.includes('al día') || vac.includes('si')) {
        vacunacionCompleta++;
      }

      // Parentesco
      const par = String(item.parentesco || 'Tutor/a').trim() || 'Tutor/a';
      parentescoMap[par] = (parentescoMap[par] || 0) + 1;

      // Edad
      const edadNum = parseNumber(item.edad);
      if (edadNum !== null) {
        edades.push(edadNum);
        const bucket = rangosEdad.find((r) => edadNum >= r.min && edadNum <= r.max);
        if (bucket) bucket.count++;
      }

      // Antropometría numérica
      const p = parseNumber(item.peso);
      const t = parseNumber(item.talla);
      const imcVal = parseNumber(item.imc);
      const cin = parseNumber(item.circunferencia_cintura);
      if (p !== null) pesos.push(p);
      if (t !== null) tallas.push(t);
      if (imcVal !== null) imcs.push(imcVal);
      else if (p !== null && t !== null && t > 30) {
        const metros = t / 100;
        imcs.push(p / (metros * metros));
      }
      if (cin !== null) cinturas.push(cin);
    });

    const avg = (arr, decimals = 1) =>
      arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(decimals) : '—';

    // Top Obras Sociales para el Donut
    const osSorted = Object.entries(obrasSocialesMap).sort((a, b) => b[1] - a[1]);
    const topOs = osSorted.slice(0, 3);
    const otrasOsCount = osSorted.slice(3).reduce((acc, [, v]) => acc + v, 0);
    const coberturaSegments = [
      ...topOs.map(([label, value], i) => ({
        label,
        value,
        color: CHART_PALETTE[i % CHART_PALETTE.length]
      })),
      ...(otrasOsCount > 0 ? [{ label: 'Otras O. Sociales', value: otrasOsCount, color: '#64748b' }] : []),
      { label: 'Sin Obra Social', value: total - conObraSocial, color: '#cbd5e1' }
    ];

    // Estado control clínico
    const evaluadosConFirma = datosFiltrados.filter((i) => Boolean(String(i.firma_profesional_texto || '').trim())).length;
    const evaluadosSinFirma = datosFiltrados.filter(
      (i) =>
        !String(i.firma_profesional_texto || '').trim() &&
        Boolean(
          parseNumber(i.peso) ||
            parseNumber(i.talla) ||
            String(i.presion_arterial || i.presion_alta || i.presion_baja || '').trim()
        )
    ).length;
    const pendientesControl = Math.max(0, total - evaluadosConFirma - evaluadosSinFirma);

    // Ordenar patologías de mayor a menor frecuencia
    const patologiasOrdenadas = [...patologiasDetalle].sort((a, b) => b.count - a.count);

    // Tabla comparativa por localidad (siempre sobre el padrón completo para poder comparar localidades entre sí)
    const porLocalidad = colonias.map((col) => {
      const itemsCol = inscripciones.filter((i) => String(i.colonia_id) === String(col.id));
      const totCol = itemsCol.length;
      const conPatCol = itemsCol.filter((i) =>
        PATOLOGIAS_META.some((pm) => Number(i[`${pm.key}_si`]) === 1)
      ).length;
      const conOsCol = itemsCol.filter((i) => Number(i.tiene_obra_social) === 1).length;
      const firmadasCol = itemsCol.filter((i) => Boolean(String(i.firma_profesional_texto || '').trim())).length;
      const edadesCol = itemsCol.map((i) => parseNumber(i.edad)).filter((n) => n !== null);
      const edadPromCol = edadesCol.length > 0
        ? (edadesCol.reduce((a, b) => a + b, 0) / edadesCol.length).toFixed(1)
        : '—';

      return {
        id: col.id,
        nombre: col.nombre,
        localidad: col.sede,
        turno: col.turno,
        suspendida: col.suspendida,
        total: totCol,
        pctPadron: pct(totCol, inscripciones.length),
        conPatologia: conPatCol,
        conObraSocial: conOsCol,
        firmadas: firmadasCol,
        edadPromedio: edadPromCol
      };
    });

    const parentescoList = Object.entries(parentescoMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count, pct: pct(count, total) }));

    return {
      total,
      sinPatologia,
      conPatologia: conUnaPatologia + conMultiplesPatologias,
      conUnaPatologia,
      conMultiplesPatologias,
      conObraSocial,
      autorizados,
      conFirmaMedica,
      conAntropometria,
      enAtencionMedica,
      vacunacionCompleta,
      edadPromedio: avg(edades, 1),
      edadMin: edades.length > 0 ? Math.min(...edades) : '—',
      edadMax: edades.length > 0 ? Math.max(...edades) : '—',
      pesoPromedio: avg(pesos, 1),
      tallaPromedio: avg(tallas, 0),
      imcPromedio: avg(imcs, 1),
      cinturaPromedio: avg(cinturas, 0),
      rangosEdad,
      coberturaSegments,
      controlSegments: [
        { label: 'Control firmado', value: evaluadosConFirma, color: '#006c4c' },
        { label: 'Medición sin firma', value: evaluadosSinFirma, color: '#0082a8' },
        { label: 'Pendiente control', value: pendientesControl, color: '#f59e0b' }
      ],
      patologiasOrdenadas,
      porLocalidad,
      parentescoList
    };
  }, [datosFiltrados, colonias, inscripciones]);

  const patologiasVisibles = soloPatologiasActivas
    ? stats.patologiasOrdenadas.filter((p) => p.count > 0)
    : stats.patologiasOrdenadas;

  const kpiCards = [
    {
      label: 'Total Inscriptos',
      value: stats.total,
      sub: `Edad prom.: ${stats.edadPromedio} años`,
      color: 'var(--md-sys-color-primary)',
      bg: '#e0f2fe',
      icon: Users
    },
    {
      label: 'Con Patologías',
      value: stats.conPatologia,
      sub: `${pct(stats.conPatologia, stats.total)}% requiere atención`,
      color: 'var(--md-sys-color-error)',
      bg: '#ffe4e6',
      icon: HeartPulse
    },
    {
      label: 'Con Obra Social',
      value: stats.conObraSocial,
      sub: `${pct(stats.conObraSocial, stats.total)}% con cobertura`,
      color: 'var(--md-sys-color-tertiary)',
      bg: '#d1fae5',
      icon: ShieldCheck
    },
    {
      label: 'Ficha Firmada',
      value: stats.conFirmaMedica,
      sub: `${pct(stats.conFirmaMedica, stats.total)}% aval profesional`,
      color: '#0284c7',
      bg: '#e0f2fe',
      icon: Stethoscope
    },
    {
      label: 'Control Autorizado',
      value: stats.autorizados,
      sub: `${pct(stats.autorizados, stats.total)}% por padre/tutor`,
      color: '#0d9488',
      bg: '#ccfbf1',
      icon: FileCheck2
    },
    {
      label: 'Vacunación al Día',
      value: stats.vacunacionCompleta,
      sub: `${pct(stats.vacunacionCompleta, stats.total)}% calendario completo`,
      color: '#d97706',
      bg: '#fef3c7',
      icon: Syringe
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileView ? '14px' : '20px' }}>
      {/* ==================== CABECERA + FILTRO POR LOCALIDAD ==================== */}
      <div
        className="hero-banner"
        style={{
          marginBottom: 0,
          padding: isMobileView ? '16px' : '20px 24px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobileView ? 'flex-start' : 'center',
            flexDirection: isMobileView ? 'column' : 'row',
            gap: '8px'
          }}
        >
          <div>
            <h2
              className="font-display"
              style={{
                fontSize: isMobileView ? '1.2rem' : '1.5rem',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.2
              }}
            >
              Estadísticas e Indicadores de Salud
            </h2>
            <p
              style={{
                fontSize: isMobileView ? '0.8rem' : '0.86rem',
                color: 'rgba(255,255,255,0.88)',
                marginTop: '3px'
              }}
            >
              Panorama integral médico, demográfico y de cobertura en tiempo real
            </p>
          </div>
          <span
            style={{
              padding: '5px 12px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              whiteSpace: 'nowrap'
            }}
          >
            Muestra analizada: {stats.total} {stats.total === 1 ? 'ficha' : 'fichas'}
          </span>
        </div>

        {/* Selector de Localidad */}
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.2)'
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
            Filtrar métricas por localidad
          </div>
          <div className={isMobileView ? 'hero-chips-mobile' : undefined} style={!isMobileView ? { display: 'flex', flexWrap: 'wrap', gap: '8px' } : undefined}>
            <button
              onClick={() => setLocalidadFilter('todas')}
              className={`hero-chip ${localidadFilter === 'todas' ? 'active' : ''}`}
            >
              <MapPin size={13} />
              Todas las Localidades ({inscripciones.length})
            </button>
            {colonias.map((c) => {
              const countCol = inscripciones.filter((i) => String(i.colonia_id) === String(c.id)).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setLocalidadFilter(String(c.id))}
                  className={`hero-chip ${String(localidadFilter) === String(c.id) ? 'active' : ''}`}
                >
                  {c.nombre} ({countCol})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== KPI GRID (2x3 EN MOBILE, 3/6 EN DESKTOP) ==================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobileView
            ? 'repeat(2, minmax(0, 1fr))'
            : 'repeat(auto-fit, minmax(195px, 1fr))',
          gap: isMobileView ? '10px' : '14px'
        }}
      >
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="stat-card"
              style={{
                padding: isMobileView ? '13px 12px' : '16px 18px',
                borderTop: `4px solid ${kpi.color}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span
                  style={{
                    fontSize: isMobileView ? '0.7rem' : '0.75rem',
                    color: 'var(--md-sys-color-on-surface-variant)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    lineHeight: 1.2
                  }}
                >
                  {kpi.label}
                </span>
                <span
                  style={{
                    width: isMobileView ? '28px' : '32px',
                    height: isMobileView ? '28px' : '32px',
                    borderRadius: '9px',
                    background: kpi.bg,
                    color: kpi.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={isMobileView ? 15 : 17} />
                </span>
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: isMobileView ? '1.75rem' : '2.15rem',
                  fontWeight: 800,
                  color: kpi.color,
                  lineHeight: 1.05
                }}
              >
                {kpi.value}
              </div>
              <div
                style={{
                  fontSize: isMobileView ? '0.73rem' : '0.78rem',
                  color: 'var(--md-sys-color-on-surface-variant)',
                  lineHeight: 1.25
                }}
              >
                {kpi.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== GRÁFICOS CIRCULARES (DONUT CHARTS) ==================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobileView
            ? '1fr'
            : 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: isMobileView ? '12px' : '16px'
        }}
      >
        <DonutChartCard
          subtitle="Salud General"
          title="Condición Médica del Padrón"
          centerValue={`${pct(stats.sinPatologia, stats.total)}%`}
          centerLabel="Sin patologías"
          isMobile={isMobileView}
          segments={[
            { label: 'Sin patologías', value: stats.sinPatologia, color: '#006c4c' },
            { label: '1 patología', value: stats.conUnaPatologia, color: '#f59e0b' },
            { label: '2 o más patologías', value: stats.conMultiplesPatologias, color: '#ba1a1a' }
          ]}
        />

        <DonutChartCard
          subtitle="Cobertura Médica"
          title="Distribución de Obras Sociales"
          centerValue={`${pct(stats.conObraSocial, stats.total)}%`}
          centerLabel="Con cobertura"
          isMobile={isMobileView}
          segments={stats.coberturaSegments}
        />

        <DonutChartCard
          subtitle="Seguimiento Clínico"
          title="Estado de Revisión Médica"
          centerValue={`${stats.conFirmaMedica}/${stats.total}`}
          centerLabel="Firmadas"
          isMobile={isMobileView}
          segments={stats.controlSegments}
        />
      </div>

      {/* ==================== DEMOGRAFÍA (EDADES) + ANTROPOMETRÍA & VÍNCULO ==================== */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobileView ? '1fr' : '1.1fr 0.9fr',
          gap: isMobileView ? '12px' : '16px'
        }}
      >
        {/* Distribución por Rangos Etarios */}
        <div className="gf-card" style={{ padding: isMobileView ? '16px 14px' : '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--md-sys-color-primary)' }}>
                Demografía
              </div>
              <h3 className="font-display" style={{ fontSize: isMobileView ? '1.04rem' : '1.12rem', fontWeight: 800 }}>
                Distribución por Grupos de Edad
              </h3>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)'
              }}
            >
              Rango: {stats.edadMin} a {stats.edadMax} años
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.rangosEdad.map((r, idx) => {
              const porcentaje = pct(r.count, stats.total);
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.84rem', marginBottom: '4px' }}>
                    <span>
                      <strong>{r.label}</strong>{' '}
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({r.sub})</span>
                    </span>
                    <span style={{ fontWeight: 800, color: r.color }}>
                      {r.count} {r.count === 1 ? 'niño/a' : 'niños/as'} ({porcentaje}%)
                    </span>
                  </div>
                  <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${porcentaje}%`,
                        background: r.color,
                        borderRadius: '999px',
                        transition: 'width 0.35s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Promedios Clínicos / Antropométricos + Vínculo Responsable */}
        <div className="gf-card" style={{ padding: isMobileView ? '16px 14px' : '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--md-sys-color-tertiary)' }}>
              <Activity size={14} />
              <span>Control Niño Sano</span>
            </div>
            <h3 className="font-display" style={{ fontSize: isMobileView ? '1.04rem' : '1.12rem', fontWeight: 800, marginBottom: '10px' }}>
              Promedios Antropométricos
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Peso Promedio</div>
                <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {stats.pesoPromedio !== '—' ? `${stats.pesoPromedio} kg` : '—'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Talla Promedio</div>
                <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {stats.tallaPromedio !== '—' ? `${stats.tallaPromedio} cm` : '—'}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>IMC Promedio</div>
                <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#006494' }}>
                  {stats.imcPromedio}
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>En Atención Médica</div>
                <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800, color: stats.enAtencionMedica > 0 ? '#b45309' : '#006c4c' }}>
                  {stats.enAtencionMedica} ({pct(stats.enAtencionMedica, stats.total)}%)
                </div>
              </div>
            </div>
          </div>

          {/* Vínculo del Tutor */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              <UserCheck size={14} /> Adulto Responsable Declarado:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {stats.parentescoList.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sin registros</span>
              ) : (
                stats.parentescoList.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: '#eff6ff',
                      color: '#1e3a8a',
                      border: '1px solid #bfdbfe'
                    }}
                  >
                    {p.label}: {p.count} ({p.pct}%)
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== GRÁFICO EN TABLA 1: PREVALENCIA DE PATOLOGÍAS ==================== */}
      <div className="gf-card" style={{ padding: isMobileView ? '16px 14px' : '22px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobileView ? 'flex-start' : 'center',
            flexDirection: isMobileView ? 'column' : 'row',
            gap: '10px',
            marginBottom: '14px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#ba1a1a' }}>
              <Table2 size={14} />
              <span>Gráfico en Tabla • Epidemiología</span>
            </div>
            <h3 className="font-display" style={{ fontSize: isMobileView ? '1.06rem' : '1.16rem', fontWeight: 800 }}>
              Detalle de Patologías y Condiciones Declaradas
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setSoloPatologiasActivas(!soloPatologiasActivas)}
            className={`md3-chip ${soloPatologiasActivas ? 'active' : ''}`}
            style={{ fontSize: '0.76rem', padding: '5px 12px' }}
          >
            {soloPatologiasActivas ? 'Mostrando solo con casos • Ver las 13' : 'Filtrar solo con casos (> 0)'}
          </button>
        </div>

        {patologiasVisibles.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#006c4c', fontWeight: 600, background: '#f0fdf4', borderRadius: '12px' }}>
            ✔ No se registran casos activos de patologías en la selección actual.
          </div>
        ) : isMobileView ? (
          /* Vista Mobile optimizada: tarjetas-fila ultra legibles sin scroll horizontal */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {patologiasVisibles.map((pat) => {
              const p = pct(pat.count, stats.total);
              const hasCases = pat.count > 0;
              return (
                <div
                  key={pat.key}
                  style={{
                    padding: '11px 12px',
                    borderRadius: '12px',
                    background: hasCases ? '#fff1f2' : '#f8fafc',
                    border: hasCases ? '1px solid #fecdd3' : '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.86rem', color: hasCases ? '#881337' : '#334155' }}>
                      {pat.label}
                    </strong>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: hasCases ? '#be123c' : '#e2e8f0',
                        color: hasCases ? '#ffffff' : '#475569',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {pat.count} {pat.count === 1 ? 'caso' : 'casos'} ({p}%)
                    </span>
                  </div>

                  {/* Barra visual integrada */}
                  <div style={{ height: '6px', background: hasCases ? '#ffe4e6' : '#e2e8f0', borderRadius: '999px', marginTop: '7px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${hasCases ? Math.max(p, 6) : 0}%`,
                        background: '#be123c',
                        borderRadius: '999px'
                      }}
                    />
                  </div>

                  {hasCases && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {pat.afectados.map((af, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectFicha && onSelectFicha(af.ficha)}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #fda4af',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '0.74rem',
                            color: '#881337',
                            textAlign: 'left',
                            cursor: onSelectFicha ? 'pointer' : 'default'
                          }}
                        >
                          <strong>{af.nombre}:</strong> {af.detalle}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista Desktop: Tabla analítica con barras integradas */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px', width: '24%' }}>Patología / Condición</th>
                  <th style={{ padding: '10px 12px', width: '10%', textAlign: 'center' }}>Casos</th>
                  <th style={{ padding: '10px 12px', width: '24%' }}>Prevalencia (%)</th>
                  <th style={{ padding: '10px 12px', width: '42%' }}>Niños/as y Detalle Clínico</th>
                </tr>
              </thead>
              <tbody>
                {patologiasVisibles.map((pat) => {
                  const p = pct(pat.count, stats.total);
                  const hasCases = pat.count > 0;
                  return (
                    <tr
                      key={pat.key}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: hasCases ? '#fff5f5' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: hasCases ? '#881337' : '#334155' }}>
                        {pat.label}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            minWidth: '28px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            background: hasCases ? '#be123c' : '#e2e8f0',
                            color: hasCases ? '#fff' : '#475569'
                          }}
                        >
                          {pat.count}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${hasCases ? Math.max(p, 5) : 0}%`,
                                background: '#be123c',
                                borderRadius: '999px'
                              }}
                            />
                          </div>
                          <span style={{ fontWeight: 700, minWidth: '36px', textAlign: 'right', color: hasCases ? '#be123c' : '#64748b' }}>
                            {p}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {hasCases ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {pat.afectados.map((af, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => onSelectFicha && onSelectFicha(af.ficha)}
                                title="Ver ficha médica completa"
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #fda4af',
                                  borderRadius: '8px',
                                  padding: '3px 9px',
                                  fontSize: '0.76rem',
                                  color: '#881337',
                                  cursor: onSelectFicha ? 'pointer' : 'default'
                                }}
                              >
                                <strong>{af.nombre}:</strong> {af.detalle}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Sin casos declarados</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================== GRÁFICO EN TABLA 2: COMPARATIVA POR LOCALIDAD ==================== */}
      <div className="gf-card" style={{ padding: isMobileView ? '16px 14px' : '22px' }}>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--md-sys-color-primary)' }}>
            <MapPin size={14} />
            <span>Comparativa Territorial</span>
          </div>
          <h3 className="font-display" style={{ fontSize: isMobileView ? '1.06rem' : '1.16rem', fontWeight: 800 }}>
            Resumen Comparativo por Colonia / Localidad
          </h3>
        </div>

        {isMobileView ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.porLocalidad.map((loc) => (
              <div
                key={loc.id}
                style={{
                  padding: '13px',
                  borderRadius: '14px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#0f172a', display: 'block' }}>{loc.nombre}</strong>
                    <span style={{ fontSize: '0.76rem', color: '#64748b' }}>📍 {loc.localidad}</span>
                  </div>
                  <span
                    style={{
                      background: '#cbe6ff',
                      color: '#001e30',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {loc.total} ({loc.pctPadron}%)
                  </span>
                </div>

                {/* Barra de participación sobre el padrón total */}
                <div style={{ height: '7px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${loc.pctPadron}%`,
                      background: 'var(--md-sys-color-primary)',
                      borderRadius: '999px'
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '6px',
                    textAlign: 'center',
                    fontSize: '0.74rem'
                  }}
                >
                  <div style={{ background: '#ffffff', padding: '6px 4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b' }}>Patologías</div>
                    <strong style={{ color: loc.conPatologia > 0 ? '#be123c' : '#0f172a', fontSize: '0.86rem' }}>
                      {loc.conPatologia}
                    </strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '6px 4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b' }}>O. Social</div>
                    <strong style={{ color: '#006c4c', fontSize: '0.86rem' }}>{loc.conObraSocial}</strong>
                  </div>
                  <div style={{ background: '#ffffff', padding: '6px 4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#64748b' }}>Firmadas</div>
                    <strong style={{ color: '#006494', fontSize: '0.86rem' }}>{loc.firmadas}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#475569', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Colonia / Localidad</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Inscriptos</th>
                  <th style={{ padding: '10px 12px', width: '22%' }}>Participación Padrón</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Con Patologías</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Con Obra Social</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Control Firmado</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Edad Prom.</th>
                </tr>
              </thead>
              <tbody>
                {stats.porLocalidad.map((loc) => (
                  <tr key={loc.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>{loc.nombre}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        📍 {loc.localidad} • {loc.turno}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, fontSize: '0.96rem', color: 'var(--md-sys-color-primary)' }}>
                      {loc.total}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${loc.pctPadron}%`,
                              background: 'var(--md-sys-color-primary)',
                              borderRadius: '999px'
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 700, minWidth: '36px', textAlign: 'right' }}>{loc.pctPadron}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: loc.conPatologia > 0 ? '#be123c' : '#64748b' }}>
                      {loc.conPatologia} ({pct(loc.conPatologia, loc.total)}%)
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#006c4c' }}>
                      {loc.conObraSocial} ({pct(loc.conObraSocial, loc.total)}%)
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#0284c7' }}>
                      {loc.firmadas}/{loc.total}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                      {loc.edadPromedio !== '—' ? `${loc.edadPromedio} años` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
