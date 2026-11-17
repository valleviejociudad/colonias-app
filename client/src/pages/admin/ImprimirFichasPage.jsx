import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Printer, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import FichaMedicaVerticalView from '../../components/ficha/FichaMedicaVerticalView';
import { API_BASE } from '../../config';

// Todas las fichas de una colonia (o de todas), una por hoja, listas para imprimir o guardar como PDF.
// Se abre en una pestaña aparte desde el panel: /admin/imprimir?colonia=<id|todas>
export default function ImprimirFichasPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const coloniaId = params.get('colonia') || 'todas';

  const [fichas, setFichas] = useState(null);
  const [colonias, setColonias] = useState([]);
  const [error, setError] = useState(null);
  const [isMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const yaImprimio = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [resIns, resCol] = await Promise.all([authFetch(`${API_BASE}/inscripciones`), authFetch(`${API_BASE}/colonias`)]);
        if (!resIns.ok) throw new Error();
        const [ins, cols] = await Promise.all([resIns.json(), resCol.json()]);
        setColonias(Array.isArray(cols) ? cols : []);
        setFichas(Array.isArray(ins) ? ins : []);
      } catch (err) {
        if (err?.code === 'UNAUTHORIZED') {
          navigate('/login');
          return;
        }
        setError('No se pudieron cargar las fichas. Cerrá esta pestaña y probá de nuevo.');
      }
    })();
  }, [authFetch, navigate]);

  const seleccion = useMemo(() => {
    if (!fichas) return [];
    return fichas
      .filter((f) => coloniaId === 'todas' || String(f.colonia_id) === String(coloniaId))
      .sort(
        (a, b) =>
          String(a.colonia_nombre || '').localeCompare(String(b.colonia_nombre || ''), 'es') ||
          String(a.nino_nombre || '').localeCompare(String(b.nino_nombre || ''), 'es')
      );
  }, [fichas, coloniaId]);

  const nombreColonia =
    coloniaId === 'todas' ? 'Todas las colonias' : colonias.find((c) => String(c.id) === String(coloniaId))?.nombre || 'Colonia';

  useEffect(() => {
    document.title = `Fichas médicas · ${nombreColonia}`;
  }, [nombreColonia]);

  // Abre el diálogo de impresión una sola vez, cuando ya cargaron las fichas y los logos
  useEffect(() => {
    if (yaImprimio.current || !fichas || seleccion.length === 0) return;
    yaImprimio.current = true;
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))))
      .then(() => setTimeout(() => window.print(), 300));
  }, [fichas, seleccion.length]);

  return (
    <div className="imprimir-fichas">
      <style>
        {`@page { size: A4 ${isMobile ? 'portrait; margin: 4mm' : 'landscape; margin: 6mm'}; }
          .imprimir-fichas { background: var(--surface-2, #eef3f6); min-height: 100vh; padding: 16px; }
          .imprimir-barra { position: sticky; top: 0; z-index: 5; display: flex; gap: 12px; align-items: center; justify-content: space-between;
            flex-wrap: wrap; background: #fff; border: 1px solid var(--line, #c6dae4); border-radius: 16px; padding: 12px 16px; margin: 0 auto 16px; max-width: 1160px; }
          .imprimir-hoja { margin: 0 auto 16px; max-width: 1160px; }
          @media print {
            .imprimir-fichas { background: #fff !important; padding: 0 !important; }
            .imprimir-hoja { margin: 0 !important; max-width: none !important; break-after: page; page-break-after: always; break-inside: avoid; }
            .imprimir-hoja:last-child { break-after: auto; page-break-after: auto; }
          }`}
      </style>

      <div className="imprimir-barra no-print">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{nombreColonia}</div>
          <div style={{ color: 'var(--ink-2, #4a6270)', fontSize: '0.95rem' }}>
            {fichas === null && !error
              ? 'Cargando fichas…'
              : `${seleccion.length} ${seleccion.length === 1 ? 'ficha' : 'fichas'} · una por hoja. Para guardar en PDF, elegí “Guardar como PDF” en la impresora.`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="md3-btn md3-btn-filled" onClick={() => window.print()} disabled={!seleccion.length}>
            <Printer size={18} /> Imprimir / Guardar PDF
          </button>
          <button className="md3-btn md3-btn-outlined" onClick={() => window.close()}>
            <X size={18} /> Cerrar
          </button>
        </div>
      </div>

      {error && (
        <div className="notice danger" role="alert" style={{ maxWidth: 1160, margin: '0 auto' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {fichas && seleccion.length === 0 && (
        <p className="no-print" style={{ textAlign: 'center', color: 'var(--ink-2, #4a6270)' }}>
          No hay fichas cargadas en esta colonia.
        </p>
      )}

      {seleccion.map((f) => (
        <div key={f.id} className="imprimir-hoja">
          <FichaMedicaVerticalView ficha={f} soloPlanilla />
        </div>
      ))}
    </div>
  );
}
