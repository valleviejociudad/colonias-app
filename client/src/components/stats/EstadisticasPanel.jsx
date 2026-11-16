import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, BarChart3 } from 'lucide-react';

const PATOLOGIAS_META = [
  { key: 'alergias', label: 'Alergias' },
  { key: 'asmas', label: 'Asma o broncoespasmo' },
  { key: 'oftalmologicas', label: 'Problemas de la vista' },
  { key: 'celiaquia', label: 'Celiaquía (sin TACC)' },
  { key: 'discapacidad', label: 'Discapacidad' },
  { key: 'cardiacas', label: 'Problemas del corazón' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'neurologicas', label: 'Problemas neurológicos' },
  { key: 'auditivas', label: 'Problemas de audición' },
  { key: 'rinones', label: 'Problemas de riñón' },
  { key: 'tiroides', label: 'Tiroides' },
  { key: 'oncologicas', label: 'Oncológicas' },
  { key: 'otras', label: 'Otras condiciones' }
];

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);
const plural = (n, uno, varios) => (n === 1 ? uno : varios);

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(',', '.').replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

const tieneFirma = (i) => Boolean(String(i.firma_profesional_texto || '').trim());
const tieneMedidas = (i) =>
  Boolean(
    parseNumber(i.peso) ||
      parseNumber(i.talla) ||
      String(i.presion_arterial || i.presion_alta || i.presion_baja || '').trim()
  );

/**
 * Clasifica lo que la familia declaró sobre las vacunas.
 * El formulario guarda exactamente: "Completo según Calendario Nacional",
 * "En curso / Pendiente refuerzo" o "Incompleto". Un campo vacío es "sin dato",
 * nunca "al día".
 */
function estadoVacunas(valor) {
  const s = String(valor || '').trim().toLowerCase();
  if (!s) return 'sin_dato';
  if (s.includes('incomplet')) return 'incompleto';
  if (/curso|pendiente|falta|refuerzo/.test(s)) return 'en_curso';
  if (/^complet/.test(s) || s.includes('al día') || s.includes('al dia')) return 'completo';
  return 'sin_dato';
}

// Rangos sin huecos: una edad de 7,5 años cae en "8 a 10" solo si es ≥ 8.
const RANGOS_EDAD = [
  { label: 'Hasta 7 años', test: (e) => e < 8 },
  { label: '8 a 10 años', test: (e) => e >= 8 && e < 11 },
  { label: '11 a 13 años', test: (e) => e >= 11 && e < 14 },
  { label: '14 años o más', test: (e) => e >= 14 }
];

function NombreBoton({ ficha, detalle, onSelectFicha }) {
  return (
    <button type="button" className="name-btn" onClick={() => onSelectFicha && onSelectFicha(ficha)}>
      <strong>{ficha.nino_nombre || 'Sin nombre'}</strong>
      {detalle && <span>{detalle}</span>}
    </button>
  );
}

function ListaBarras({ items, total }) {
  return (
    <ul className="bar-list">
      {items.map((it) => {
        const p = pct(it.value, total);
        return (
          <li key={it.label}>
            <div className="bar-label">
              <span>{it.label}</span>
              <b>
                {it.value}
                <span>({p}%)</span>
              </b>
            </div>
            <div
              className="bar-track"
              role="img"
              aria-label={`${it.label}: ${it.value} de ${total} (${p}%)`}
            >
              <div className={`bar-fill ${it.muted ? 'is-muted' : ''}`} style={{ width: `${p}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** En PC es una tarjeta abierta; en el celular, una sección que se despliega. */
function Seccion({ titulo, nota, isMobile, defaultOpen = false, children }) {
  if (isMobile) {
    return (
      <details className="stats-section" open={defaultOpen || undefined}>
        <summary>
          {titulo}
          <ChevronDown size={22} aria-hidden="true" />
        </summary>
        {nota && <p className="stats-note">{nota}</p>}
        {children}
      </details>
    );
  }
  return (
    <section className="stats-card">
      <h3>{titulo}</h3>
      {nota && <p className="stats-note">{nota}</p>}
      {children}
    </section>
  );
}

export default function EstadisticasPanel({
  inscripciones = [],
  colonias = [],
  isMobileView = false,
  onSelectFicha,
  localidad = 'todas',
  onLocalidadChange,
  laneColor = () => '#8aa5b2'
}) {
  const [verTodasCondiciones, setVerTodasCondiciones] = useState(false);
  const setLocalidad = (v) => onLocalidadChange && onLocalidadChange(v);

  const coloniaActual = colonias.find((c) => String(c.id) === String(localidad));
  const filtroValido = localidad === 'todas' || Boolean(coloniaActual);

  const datos = useMemo(() => {
    if (!filtroValido || localidad === 'todas') return inscripciones;
    return inscripciones.filter((i) => String(i.colonia_id) === String(localidad));
  }, [inscripciones, localidad, filtroValido]);

  const conteoPorColonia = useMemo(() => {
    const m = {};
    inscripciones.forEach((i) => {
      m[String(i.colonia_id)] = (m[String(i.colonia_id)] || 0) + 1;
    });
    return m;
  }, [inscripciones]);

  const s = useMemo(() => {
    const total = datos.length;
    const condiciones = PATOLOGIAS_META.map((pm) => ({ ...pm, afectados: [] }));
    const conCondicion = [];
    let sinCondicion = 0;
    let unaCondicion = 0;
    let variasCondiciones = 0;
    let conObraSocial = 0;
    let firmadas = 0;
    let medidasSinFirma = 0;
    const vac = { completo: 0, en_curso: 0, incompleto: 0, sin_dato: 0 };
    const obras = {};
    const edades = [];
    const rangos = RANGOS_EDAD.map((r) => ({ ...r, value: 0 }));
    let edadSinDato = 0;
    const pesos = [];
    const tallas = [];
    const imcs = [];
    const cinturas = [];
    let conMedidas = 0;

    datos.forEach((item) => {
      const suyas = [];
      condiciones.forEach((c) => {
        if (Number(item[`${c.key}_si`]) === 1) {
          const detalle = String(item[`${c.key}_cual`] || '').trim();
          c.afectados.push({ ficha: item, detalle });
          suyas.push(c.label);
        }
      });
      if (suyas.length === 0) sinCondicion++;
      else {
        if (suyas.length === 1) unaCondicion++;
        else variasCondiciones++;
        conCondicion.push({ ficha: item, detalle: suyas.join(', ') });
      }

      if (Number(item.tiene_obra_social) === 1) {
        conObraSocial++;
        const nombre = String(item.obra_social_nombre || '').trim() || 'Sin nombre cargado';
        obras[nombre] = (obras[nombre] || 0) + 1;
      }

      const firmada = tieneFirma(item);
      const medida = tieneMedidas(item);
      if (firmada) firmadas++;
      else if (medida) medidasSinFirma++;

      vac[estadoVacunas(item.esquema_vacunacion)]++;

      const edad = parseNumber(item.edad);
      if (edad === null) edadSinDato++;
      else {
        edades.push(edad);
        const r = rangos.find((x) => x.test(edad));
        if (r) r.value++;
      }

      const p = parseNumber(item.peso);
      const t = parseNumber(item.talla);
      const imc = parseNumber(item.imc);
      const cin = parseNumber(item.circunferencia_cintura);
      if (p !== null || t !== null) conMedidas++;
      if (p !== null) pesos.push(p);
      if (t !== null) tallas.push(t);
      if (imc !== null) imcs.push(imc);
      else if (p !== null && t !== null && t > 30) imcs.push(p / (t / 100) ** 2);
      if (cin !== null) cinturas.push(cin);
    });

    const prom = (arr, dec = 1) =>
      arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(dec).replace('.', ',') : null;

    const obrasOrden = Object.entries(obras).sort((a, b) => b[1] - a[1]);
    const otras = obrasOrden.slice(3).reduce((acc, [, v]) => acc + v, 0);
    const obraSocialBarras = [
      ...obrasOrden.slice(0, 3).map(([label, value]) => ({ label, value })),
      ...(otras > 0 ? [{ label: 'Otras obras sociales', value: otras }] : []),
      { label: 'Sin obra social', value: total - conObraSocial, muted: true }
    ];

    const porColonia = colonias.map((col) => {
      const items = inscripciones.filter((i) => String(i.colonia_id) === String(col.id));
      const eds = items.map((i) => parseNumber(i.edad)).filter((n) => n !== null);
      return {
        id: col.id,
        nombre: col.nombre,
        lugar: col.turno || '',
        total: items.length,
        conCondicion: items.filter((i) => PATOLOGIAS_META.some((pm) => Number(i[`${pm.key}_si`]) === 1)).length,
        conObraSocial: items.filter((i) => Number(i.tiene_obra_social) === 1).length,
        firmadas: items.filter(tieneFirma).length,
        edad: eds.length ? (eds.reduce((a, b) => a + b, 0) / eds.length).toFixed(1).replace('.', ',') : null
      };
    });

    return {
      total,
      condiciones: [...condiciones].sort((a, b) => b.afectados.length - a.afectados.length),
      conCondicion,
      sinCondicion,
      unaCondicion,
      variasCondiciones,
      conObraSocial,
      firmadas,
      vac,
      edadPromedio: prom(edades),
      edadSinDato,
      rangos,
      obraSocialBarras,
      revisionBarras: [
        { label: 'Firmadas por el médico', value: firmadas },
        { label: 'Medidos, falta la firma', value: medidasSinFirma },
        { label: 'Sin revisar todavía', value: total - firmadas - medidasSinFirma, muted: true }
      ],
      vacunasBarras: [
        { label: 'Completas', value: vac.completo },
        { label: 'Les falta algún refuerzo', value: vac.en_curso },
        { label: 'Incompletas', value: vac.incompleto },
        { label: 'Sin dato', value: vac.sin_dato, muted: true }
      ],
      medidas: {
        n: conMedidas,
        peso: prom(pesos),
        talla: prom(tallas, 0),
        imc: prom(imcs),
        cintura: prom(cinturas, 0)
      },
      porColonia
    };
  }, [datos, colonias, inscripciones]);

  const nombreFiltro = localidad === 'todas' || !coloniaActual ? 'todas las colonias' : coloniaActual.nombre;

  const condicionesVisibles = verTodasCondiciones ? s.condiciones : s.condiciones.filter((c) => c.afectados.length > 0);
  const condicionesEnCero = s.condiciones.length - s.condiciones.filter((c) => c.afectados.length > 0).length;

  // ---------- Sin fichas cargadas ----------
  if (inscripciones.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <BarChart3 size={30} />
        </div>
        <h3>Todavía no hay fichas cargadas</h3>
        <p>Cuando las familias completen la inscripción, acá vas a ver el resumen de salud de los chicos.</p>
      </div>
    );
  }

  return (
    <div className="stats">
      {/* ==================== CABECERA + FILTRO ==================== */}
      <section className="hero-banner stats-banner" aria-label="Resumen de las fichas" style={{ marginBottom: 0 }}>
        <h2 style={{ fontSize: isMobileView ? '1.3rem' : '1.6rem', fontWeight: 800 }}>Resumen de las fichas</h2>
        <p>
          {s.total} {plural(s.total, 'ficha', 'fichas')} de {nombreFiltro}
        </p>
        <span className="stats-filter-label" id="stats-filtro-label">
          Mostrar los datos de:
        </span>
        <div className="stats-filter" role="group" aria-labelledby="stats-filtro-label">
          <button
            type="button"
            onClick={() => setLocalidad('todas')}
            className={`hero-chip ${localidad === 'todas' || !filtroValido ? 'active' : ''}`}
            aria-pressed={localidad === 'todas' || !filtroValido}
          >
            Todas ({inscripciones.length})
          </button>
          {colonias.map((c) => {
            const activo = String(localidad) === String(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setLocalidad(String(c.id))}
                className={`hero-chip ${activo ? 'active' : ''}`}
                aria-pressed={activo}
              >
                <span className="lane-swatch" style={{ background: laneColor(c.id) }} />
                {c.nombre} ({conteoPorColonia[String(c.id)] || 0})
              </button>
            );
          })}
        </div>
      </section>

      {s.total === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <BarChart3 size={30} />
          </div>
          <h3>{nombreFiltro} todavía no tiene fichas</h3>
          <p>Elegí otra colonia o mirá los datos de todas juntas.</p>
          <button type="button" className="md3-btn md3-btn-filled" onClick={() => setLocalidad('todas')}>
            Ver todas las colonias
          </button>
        </div>
      ) : (
        <>
            <section className="stats-card" aria-labelledby="en-numeros">
              <h3 id="en-numeros">En números</h3>
              <dl className="facts" style={{ gridTemplateColumns: isMobileView ? undefined : 'repeat(3, minmax(0, 1fr))' }}>
                <div>
                  <dt>Inscriptos</dt>
                  <dd>{s.total}</dd>
                </div>
                <div>
                  <dt>Edad promedio</dt>
                  <dd>
                    {s.edadPromedio ? `${s.edadPromedio} años` : 'Sin dato'}
                    {s.edadSinDato > 0 && <small>{s.edadSinDato} sin fecha de nacimiento</small>}
                  </dd>
                </div>
                <div>
                  <dt>Tienen obra social</dt>
                  <dd>
                    {pct(s.conObraSocial, s.total)}%<small>{s.conObraSocial} de {s.total}</small>
                  </dd>
                </div>
                <div>
                  <dt>Vacunas completas</dt>
                  <dd>
                    {pct(s.vac.completo, s.total)}%
                    <small>
                      {s.vac.completo} de {s.total}
                      {s.vac.sin_dato > 0 ? ` · ${s.vac.sin_dato} sin dato` : ''}
                    </small>
                  </dd>
                </div>
                <div>
                  <dt>Fichas firmadas</dt>
                  <dd>
                    {s.firmadas} de {s.total}
                  </dd>
                </div>
                <div>
                  <dt>Sin condiciones de salud</dt>
                  <dd>
                    {pct(s.sinCondicion, s.total)}%<small>{s.sinCondicion} de {s.total}</small>
                  </dd>
                </div>
              </dl>
            </section>

          {/* ==================== CONDICIONES DE SALUD ==================== */}
          <Seccion
            titulo="Chicos con condiciones de salud"
            isMobile={isMobileView}
            defaultOpen
            nota={
              s.conCondicion.length === 0
                ? undefined
                : `${s.unaCondicion} ${plural(s.unaCondicion, 'chico tiene', 'chicos tienen')} una condición y ${s.variasCondiciones} ${plural(s.variasCondiciones, 'tiene', 'tienen')} dos o más. Tocá un nombre para abrir su ficha.`
            }
          >
            {condicionesVisibles.length === 0 ? (
              <p className="attend-ok" style={{ marginTop: 14 }}>
                <Check size={18} aria-hidden="true" /> Ningún chico tiene condiciones de salud declaradas.
              </p>
            ) : (
              <ul className="cond-list">
                {condicionesVisibles.map((c) => {
                  const n = c.afectados.length;
                  return (
                    <li key={c.key} className="cond-row">
                      <div className="cond-name">
                        <span className={`count-badge ${n === 0 ? 'is-zero' : ''}`}>
                          {n}
                          <span className="sr-only"> {plural(n, 'caso', 'casos')} de</span>
                        </span>
                        {c.label}
                      </div>
                      {n === 0 ? (
                        <span className="cond-empty">Nadie</span>
                      ) : (
                        <div className="name-list">
                          {c.afectados.map((a) => (
                            <NombreBoton
                              key={a.ficha.id ?? a.ficha.nino_dni}
                              ficha={a.ficha}
                              detalle={a.detalle}
                              onSelectFicha={onSelectFicha}
                            />
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {condicionesEnCero > 0 && (
              <button
                type="button"
                className="attend-toggle cond-more"
                aria-expanded={verTodasCondiciones}
                onClick={() => setVerTodasCondiciones((v) => !v)}
              >
                {verTodasCondiciones
                  ? 'Ocultar las que no tienen casos'
                  : `Ver también las ${condicionesEnCero} sin casos`}
                <ChevronDown size={18} aria-hidden="true" />
              </button>
            )}
          </Seccion>

          {/* ==================== DISTRIBUCIONES ==================== */}
          <div className="stats-grid">
            <Seccion
              titulo="Revisión médica"
              isMobile={isMobileView}
              nota="“Medidos” son los que ya tienen peso, altura o presión cargados."
            >
              <ListaBarras items={s.revisionBarras} total={s.total} />
            </Seccion>
            <Seccion titulo="Vacunas" isMobile={isMobileView} nota="Según lo que declaró la familia en el formulario.">
              <ListaBarras items={s.vacunasBarras} total={s.total} />
            </Seccion>
            <Seccion titulo="Obra social" isMobile={isMobileView}>
              <ListaBarras items={s.obraSocialBarras} total={s.total} />
            </Seccion>
            <Seccion
              titulo="Edades"
              isMobile={isMobileView}
              nota={s.edadSinDato > 0 ? `${s.edadSinDato} ${plural(s.edadSinDato, 'chico no tiene', 'chicos no tienen')} la edad cargada.` : undefined}
            >
              <ListaBarras items={s.rangos} total={s.total} />
            </Seccion>
          </div>

          {/* ==================== MEDIDAS ==================== */}
          <Seccion
            titulo="Peso y altura promedio"
            isMobile={isMobileView}
            nota={
              s.medidas.n > 0
                ? `Promedio de los ${s.medidas.n} ${plural(s.medidas.n, 'chico que tiene', 'chicos que tienen')} medidas cargadas.`
                : 'Todavía no hay medidas cargadas en las fichas.'
            }
          >
            {s.medidas.n > 0 && (
              <dl className="facts" style={{ gridTemplateColumns: isMobileView ? undefined : 'repeat(4, minmax(0, 1fr))' }}>
                <div>
                  <dt>Peso</dt>
                  <dd>{s.medidas.peso ? `${s.medidas.peso} kg` : 'Sin dato'}</dd>
                </div>
                <div>
                  <dt>Altura</dt>
                  <dd>{s.medidas.talla ? `${s.medidas.talla} cm` : 'Sin dato'}</dd>
                </div>
                <div>
                  <dt>Índice de masa corporal</dt>
                  <dd>{s.medidas.imc || 'Sin dato'}</dd>
                </div>
                <div>
                  <dt>Cintura</dt>
                  <dd>{s.medidas.cintura ? `${s.medidas.cintura} cm` : 'Sin dato'}</dd>
                </div>
              </dl>
            )}
          </Seccion>

          {/* ==================== COMPARACIÓN ==================== */}
          {s.porColonia.length > 0 && (
            <Seccion
              titulo="Comparación entre colonias"
              isMobile={isMobileView}
              nota="Muestra siempre todas las colonias, aunque arriba elijas una."
            >
              {isMobileView ? (
                <ul className="compare-items">
                  {s.porColonia.map((c) => (
                    <li key={c.id} className={`compare-item ${String(localidad) === String(c.id) ? 'is-current' : ''}`}>
                      <div className="compare-name">
                        <span className="lane-swatch" style={{ background: laneColor(c.id) }} />
                        {c.nombre}
                      </div>
                      {c.lugar && <div className="stats-note" style={{ marginTop: 2 }}>{c.lugar}</div>}
                      <dl>
                        <div>
                          <dt>Inscriptos</dt>
                          <dd>{c.total}</dd>
                        </div>
                        <div>
                          <dt>Con condiciones de salud</dt>
                          <dd>{c.conCondicion}</dd>
                        </div>
                        <div>
                          <dt>Con obra social</dt>
                          <dd>{c.conObraSocial}</dd>
                        </div>
                        <div>
                          <dt>Fichas firmadas</dt>
                          <dd>
                            {c.firmadas} de {c.total}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="compare-wrap">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th scope="col">Colonia</th>
                        <th scope="col" className="num">Inscriptos</th>
                        <th scope="col" className="num">Con condiciones de salud</th>
                        <th scope="col" className="num">Con obra social</th>
                        <th scope="col" className="num">Fichas firmadas</th>
                        <th scope="col" className="num">Edad promedio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.porColonia.map((c) => (
                        <tr key={c.id} className={String(localidad) === String(c.id) ? 'is-current' : undefined}>
                          <td>
                            <div className="compare-name">
                              <span className="lane-swatch" style={{ background: laneColor(c.id) }} />
                              {c.nombre}
                            </div>
                            {c.lugar && <div className="muted">{c.lugar}</div>}
                          </td>
                          <td className="num">
                            <b>{c.total}</b> <span className="muted">({pct(c.total, inscripciones.length)}%)</span>
                          </td>
                          <td className="num">
                            {c.conCondicion} <span className="muted">({pct(c.conCondicion, c.total)}%)</span>
                          </td>
                          <td className="num">
                            {c.conObraSocial} <span className="muted">({pct(c.conObraSocial, c.total)}%)</span>
                          </td>
                          <td className="num">
                            {c.firmadas} de {c.total}
                          </td>
                          <td className="num">{c.edad ? `${c.edad} años` : 'Sin dato'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Seccion>
          )}
        </>
      )}
    </div>
  );
}
