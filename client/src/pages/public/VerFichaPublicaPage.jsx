import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import FichaMedicaVerticalView from '../../components/ficha/FichaMedicaVerticalView';
import ComunidadWhatsAppCard from '../../components/ui/ComunidadWhatsAppCard';
import { API_BASE, asset } from '../../config';

export default function VerFichaPublicaPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/fichas/publica/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) setFicha(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="gf-page-wrapper">
      <div className="gf-water no-print">
        <div className="gf-water-logos">
          <span className="logo-chip"><img src={asset('logodeporte.png')} alt="Deporte Valle Viejo" /></span>
          <span className="logo-chip">
            <img src={asset('logovalleviejociudad.png')} alt="Municipalidad de Valle Viejo" />
          </span>
        </div>
      </div>
      <div className="gf-container" style={{ maxWidth: '1160px' }}>
        {loading ? (
          <div className="gf-card" style={{ display: 'grid', gap: 12 }}>
            <div className="skeleton" style={{ height: 28, width: '60%' }} />
            <div className="skeleton" style={{ height: 180 }} />
          </div>
        ) : !ficha ? (
          <div className="empty-state" style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
            <div className="empty-icon">
              <FileQuestion size={30} />
            </div>
            <h3>No encontramos esta ficha</h3>
            <p>Revisá que el link esté completo. Si el problema sigue, hablá con la coordinación de la colonia.</p>
            <button className="md3-btn md3-btn-filled" onClick={() => navigate('/inscripcion')}>
              Ir al formulario de inscripción
            </button>
          </div>
        ) : (
          <>
            <ComunidadWhatsAppCard className="no-print" style={{ maxWidth: 770, width: '100%', margin: '0 auto 16px' }} />
            <FichaMedicaVerticalView ficha={ficha} onBack={() => navigate(-1)} />
          </>
        )}
      </div>
    </div>
  );
}
