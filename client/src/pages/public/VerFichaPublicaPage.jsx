import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FichaMedicaVerticalView from '../../components/ficha/FichaMedicaVerticalView';

export default function VerFichaPublicaPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/fichas/publica/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) setFicha(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#006494', fontWeight: 700 }}>
        Cargando Ficha Médica Oficial...
      </div>
    );
  }

  if (!ficha) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <h3>Ficha médica no encontrada</h3>
        <button className="md3-btn md3-btn-filled" style={{ marginTop: '14px' }} onClick={() => navigate('/inscripcion')}>
          Ir al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="gf-page-wrapper">
      <div className="gf-container" style={{ maxWidth: '1160px' }}>
        <FichaMedicaVerticalView ficha={ficha} onBack={() => navigate(-1)} />
      </div>
    </div>
  );
}
