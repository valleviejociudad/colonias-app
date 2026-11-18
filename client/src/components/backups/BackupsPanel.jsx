import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, FileArchive, DatabaseBackup, Printer, Loader2, AlertCircle, CheckCircle2, Mail, X } from 'lucide-react';
import { API_BASE } from '../../config';
import { fichasAXlsx, descargarArchivo, slug, fechaHoy } from '../../utils/exportarFichas';

export default function BackupsPanel({ inscripciones, colonias, laneColor, authFetch, user, onUnauthorized, isMobileView }) {
  const esAdmin = user?.rol === 'admin';
  const [localidad, setLocalidad] = useState('todas');
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [zip, setZip] = useState(null); // { hechas, total }
  const cancelarZip = useRef(false);
  const [descargandoBackup, setDescargandoBackup] = useState(false);
  const [estadoMail, setEstadoMail] = useState(null);

  useEffect(() => {
    if (!esAdmin) return;
    authFetch(`${API_BASE}/backup/estado`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setEstadoMail)
      .catch(() => {});
  }, [authFetch, esAdmin]);

  const conteoPorColonia = useMemo(() => {
    const m = {};
    inscripciones.forEach((i) => {
      m[String(i.colonia_id)] = (m[String(i.colonia_id)] || 0) + 1;
    });
    return m;
  }, [inscripciones]);

  const filtroValido = localidad === 'todas' || colonias.some((c) => String(c.id) === String(localidad));
  const colonia = colonias.find((c) => String(c.id) === String(localidad));
  const nombreFiltro = filtroValido && colonia ? colonia.nombre : 'todas las colonias';
  const seleccion = useMemo(
    () =>
      inscripciones
        .filter((f) => !filtroValido || localidad === 'todas' || String(f.colonia_id) === String(localidad))
        .sort((a, b) => String(a.nino_nombre || '').localeCompare(String(b.nino_nombre || ''), 'es')),
    [inscripciones, localidad, filtroValido]
  );
  const sufijo = `${slug(colonia ? colonia.nombre : 'todas')}_${fechaHoy()}`;
  const ocupado = generandoExcel || Boolean(zip) || descargandoBackup;

  const manejarError = (err, mensaje) => {
    if (err?.code === 'UNAUTHORIZED') {
      onUnauthorized();
      return;
    }
    console.error(err);
    setError(mensaje);
  };

  const descargarExcel = async () => {
    setError(null);
    setAviso(null);
    setGenerandoExcel(true);
    try {
      const blob = await fichasAXlsx(seleccion, colonia ? colonia.nombre : 'Todas');
      descargarArchivo(blob, `fichas_${sufijo}.xlsx`);
      setAviso(`Listo: Excel con ${seleccion.length} ${seleccion.length === 1 ? 'ficha' : 'fichas'}.`);
    } catch (err) {
      manejarError(err, 'No se pudo armar el Excel. Probá de nuevo.');
    } finally {
      setGenerandoExcel(false);
    }
  };

  const descargarZip = async () => {
    setError(null);
    setAviso(null);
    cancelarZip.current = false;
    setZip({ hechas: 0, total: seleccion.length });
    try {
      // Se carga recién al usarlo: html-to-image + jsPDF + JSZip son pesados
      const { generarZipFichas } = await import('../ficha/generarZipFichas');
      const blob = await generarZipFichas(seleccion, {
        onProgreso: (hechas, total) => setZip({ hechas, total }),
        debeCancelar: () => cancelarZip.current
      });
      if (blob) {
        descargarArchivo(blob, `fichas_pdf_${sufijo}.zip`);
        setAviso(`Listo: ZIP con ${seleccion.length} PDF.`);
      }
    } catch (err) {
      manejarError(err, 'No se pudieron generar los PDF. Probá de nuevo o elegí una sola localidad.');
    } finally {
      setZip(null);
    }
  };

  const descargarBackup = async () => {
    setError(null);
    setAviso(null);
    setDescargandoBackup(true);
    try {
      const res = await authFetch(`${API_BASE}/backup`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'No se pudo descargar el backup.');
        return;
      }
      const nombre =
        /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || `colonias_backup_${fechaHoy()}.sqlite`;
      descargarArchivo(await res.blob(), nombre);
      setAviso('Listo: backup completo descargado. Guardalo en un lugar seguro.');
    } catch (err) {
      manejarError(err, 'No se pudo descargar el backup. Probá de nuevo.');
    } finally {
      setDescargandoBackup(false);
    }
  };

  const porcentaje = zip && zip.total ? Math.round((zip.hechas / zip.total) * 100) : 0;

  return (
    <div className="backups">
      <section className="hero-banner stats-banner" aria-label="Copias de las fichas" style={{ marginBottom: 0 }}>
        <h2 style={{ fontSize: isMobileView ? '1.3rem' : '1.6rem', fontWeight: 800 }}>Copias de las fichas</h2>
        <p>
          {seleccion.length} {seleccion.length === 1 ? 'ficha' : 'fichas'} de {nombreFiltro}
        </p>
        <span className="stats-filter-label" id="backups-filtro-label">
          Descargar las fichas de:
        </span>
        <div className="stats-filter" role="group" aria-labelledby="backups-filtro-label">
          <button
            type="button"
            onClick={() => setLocalidad('todas')}
            className={`hero-chip ${localidad === 'todas' || !filtroValido ? 'active' : ''}`}
            aria-pressed={localidad === 'todas' || !filtroValido}
            disabled={ocupado}
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
                disabled={ocupado}
              >
                <span className="lane-swatch" style={{ background: laneColor(c.id) }} />
                {c.nombre} ({conteoPorColonia[String(c.id)] || 0})
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="notice danger" role="alert">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      {aviso && !error && (
        <div className="notice ok" role="status">
          <CheckCircle2 size={20} />
          <span>{aviso}</span>
        </div>
      )}

      <div className="backup-grid">
        {/* ----- Excel ----- */}
        <section className="stats-card backup-card">
          <div className="backup-icon">
            <FileSpreadsheet size={24} />
          </div>
          <h3>Planilla Excel</h3>
          <p className="stats-note">
            Una fila por niño/a con todos los datos: tutor, contacto de urgencia, obra social y cada condición de salud.
            {localidad === 'todas' && colonias.length > 1 ? ' Trae una hoja con todas y una hoja por colonia.' : ''}
          </p>
          <button className="md3-btn md3-btn-filled" onClick={descargarExcel} disabled={ocupado || seleccion.length === 0}>
            {generandoExcel ? <Loader2 size={18} className="spin" /> : <FileSpreadsheet size={18} />}
            {generandoExcel ? 'Armando Excel…' : 'Descargar Excel'}
          </button>
        </section>

        {/* ----- ZIP de PDF ----- */}
        <section className="stats-card backup-card">
          <div className="backup-icon">
            <FileArchive size={24} />
          </div>
          <h3>Fichas en PDF</h3>
          <p className="stats-note">
            Un ZIP con un PDF por ficha, igual a la planilla oficial.
            {localidad === 'todas' && colonias.length > 1 ? ' Cada colonia va en su carpeta.' : ''} Tarda 1 a 2 segundos
            por ficha; no cierres esta pantalla mientras se genera.
          </p>

          {zip ? (
            <div className="backup-progress" aria-live="polite">
              <div className="backup-progress-label">
                <span>
                  Generando {zip.hechas} de {zip.total}…
                </span>
                <span>{porcentaje}%</span>
              </div>
              <div className="bar-track" role="progressbar" aria-valuemin={0} aria-valuemax={zip.total} aria-valuenow={zip.hechas}>
                <div className="bar-fill" style={{ width: `${porcentaje}%` }} />
              </div>
              <button className="md3-btn md3-btn-outlined" onClick={() => (cancelarZip.current = true)}>
                <X size={18} /> Cancelar
              </button>
            </div>
          ) : (
            <div className="backup-actions">
              <button className="md3-btn md3-btn-filled" onClick={descargarZip} disabled={ocupado || seleccion.length === 0}>
                <FileArchive size={18} /> Descargar ZIP
              </button>
              <Link
                to={`/admin/imprimir?colonia=${encodeURIComponent(filtroValido ? localidad : 'todas')}`}
                target="_blank"
                className="md3-btn md3-btn-tonal"
              >
                <Printer size={18} /> Imprimir todas
              </Link>
            </div>
          )}
        </section>

        {/* ----- Backup completo ----- */}
        {esAdmin && (
          <section className="stats-card backup-card">
            <div className="backup-icon">
              <DatabaseBackup size={24} />
            </div>
            <h3>Backup completo</h3>
            <p className="stats-note">
              La base de datos entera (todas las colonias, fichas, usuarios y avisos) en un solo archivo. Sirve para
              restaurar todo si algo falla en el servidor. No se abre con Excel.
            </p>
            <button className="md3-btn md3-btn-filled" onClick={descargarBackup} disabled={ocupado}>
              {descargandoBackup ? <Loader2 size={18} className="spin" /> : <DatabaseBackup size={18} />}
              {descargandoBackup ? 'Descargando…' : 'Descargar backup'}
            </button>
            {estadoMail && (
              <p className="backup-mail">
                <Mail size={16} />
                {estadoMail.mailDiario
                  ? `Además se manda por mail todos los días a las ${estadoMail.hora} hs a ${estadoMail.destino}.`
                  : estadoMail.faltaSmtp
                    ? 'El backup diario por mail está pedido, pero falta configurar el correo (SMTP) en el servidor.'
                    : 'El backup diario por mail está apagado. Se activa configurando BACKUP_EMAIL en Railway.'}
              </p>
            )}
          </section>
        )}
      </div>

      <p className="stats-note" style={{ margin: '0 4px' }}>
        Estos archivos tienen datos de salud de menores: guardalos en una computadora de la Municipalidad y no los
        compartas por WhatsApp ni redes.
      </p>
    </div>
  );
}
