import React, { useEffect, useState } from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { API_BASE } from '../../config';

// Invitación a la Comunidad de WhatsApp de las colonias. No muestra nada si el link no está cargado.
export default function ComunidadWhatsAppCard({ className = '', style }) {
  const [link, setLink] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetch(`${API_BASE}/comunidad`)
      .then((r) => r.json())
      .then((d) => {
        if (vivo && d && d.link) setLink(d.link);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  if (!link) return null;

  return (
    <section className={`comunidad-card ${className}`} style={style} aria-labelledby="comunidad-card-h">
      <span className="comunidad-card-icon" aria-hidden="true">
        <Users size={24} />
      </span>
      <div className="comunidad-card-body">
        <h2 id="comunidad-card-h">Unite a la Comunidad de WhatsApp</h2>
        <p>
          Ahí avisamos al instante si se suspende la colonia por lluvia o calor. Solo escribe la Municipalidad, así que
          no se llena de mensajes.
        </p>
        <a href={link} target="_blank" rel="noreferrer" className="md3-btn md3-btn-success md3-btn-big comunidad-card-btn">
          <MessageCircle size={20} aria-hidden="true" /> Unirme a la Comunidad
        </a>
      </div>
    </section>
  );
}
