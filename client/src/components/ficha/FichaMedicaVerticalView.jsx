import React, { useRef, useState, useEffect } from 'react';
import { Phone, MessageCircle, Printer, Download, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import HeaderValleViejo from '../ui/HeaderValleViejo';

const PATOLOGIAS_LIST = [
  { key: 'alergias', label: 'Alergias:' },
  { key: 'cardiacas', label: 'Cardíacas:' },
  { key: 'rinones', label: 'Riñones:' },
  { key: 'oncologicas', label: 'Oncológicas:' },
  { key: 'tiroides', label: 'Tiroides:' },
  { key: 'asmas', label: 'Asmas:' },
  { key: 'diabetes', label: 'Diabetes:' },
  { key: 'neurologicas', label: 'Neurológicas:' },
  { key: 'oftalmologicas', label: 'Oftalmológicas:' },
  { key: 'auditivas', label: 'Auditivas:' },
  { key: 'celiaquia', label: 'Celiaquía:' },
  { key: 'discapacidad', label: 'Discapacidad:' },
  { key: 'otras', label: 'Otras:' }
];

export default function FichaMedicaVerticalView({ ficha, onBack, showBackButton = true, hideAdminToolbar = false }) {
  const sheetRef = useRef(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Detecta si es mobile (≤ 900px) — mismo breakpoint que el CSS del app-shell
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 900 : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const handler = (e) => {
      if (window.matchMedia('print').matches) return;
      setIsMobile(e.matches);
    };
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (!ficha) return null;

  // Normaliza estructura plana o anidada
  const padre = ficha.padre || {
    apellido_nombre: ficha.padre_nombre,
    parentesco: ficha.parentesco,
    dni: ficha.padre_dni,
    telefono: ficha.padre_telefono,
    whatsapp: ficha.padre_whatsapp,
    email: ficha.padre_email,
    contacto_urgencia: ficha.contacto_urgencia
  };

  const nino = ficha.nino || {
    apellido_nombre: ficha.nino_nombre,
    dni: ficha.nino_dni,
    fecha_nacimiento: ficha.fecha_nacimiento,
    edad: ficha.edad,
    domicilio: ficha.domicilio,
    tiene_obra_social: ficha.tiene_obra_social,
    obra_social_nombre: ficha.obra_social_nombre,
    esquema_vacunacion: ficha.esquema_vacunacion,
    telefono_nino: ficha.telefono_nino,
    presion_arterial: ficha.presion_arterial,
    presion_alta: ficha.presion_alta,
    presion_baja: ficha.presion_baja,
    peso: ficha.peso,
    talla: ficha.talla,
    imc: ficha.imc,
    circunferencia_cintura: ficha.circunferencia_cintura
  };

  const medica = ficha.medica || ficha;

  const cleanPhone = String(padre.telefono || '').replace(/\D/g, '');
  const cleanWhatsapp = String(padre.whatsapp || padre.telefono || '').replace(/\D/g, '');
  const waNumber = cleanWhatsapp.startsWith('54') ? cleanWhatsapp : `549${cleanWhatsapp}`;
  const urgenciaDigits = String(padre.contacto_urgencia || '').replace(/\D/g, '');
  const telUrgencia = urgenciaDigits.length >= 7 ? urgenciaDigits : cleanPhone;

  // ──────────────────────────────────────────────────────────────
  // PDF: Portrait en mobile (ancho A4 completo sin achicar márgenes)
  //      Landscape en desktop (una página, fit proporcional sin cambios)
  // ──────────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    setGeneratingPdf(true);
    try {
      const element = sheetRef.current;

      if (isMobile) {
        // Guardamos las proporciones reales de las imágenes del DOM vivo para asegurar que html2canvas las pinte
        const liveImgs = Array.from(element.querySelectorAll('img'));
        const imgDimensions = liveImgs.map((img) => ({
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          renderedHeight: parseFloat(img.style.height) || img.offsetHeight
        }));

        // Renderizamos el clon a proporción exacta de hoja A4 Vertical (800px de ancho)
        // eliminando cualquier max-width o padding de contenedores móviles que antes la angostaban
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 840,
          onclone: (clonedDoc, clonedEl) => {
            let parent = clonedEl.parentElement;
            while (parent && parent !== clonedDoc.documentElement) {
              parent.style.maxWidth = 'none';
              parent.style.width = 'auto';
              parent.style.padding = '0';
              parent.style.margin = '0';
              parent.style.overflow = 'visible';
              parent = parent.parentElement;
            }

            clonedEl.style.width = '800px';
            clonedEl.style.minWidth = '800px';
            clonedEl.style.maxWidth = '800px';
            clonedEl.style.margin = '0';
            clonedEl.style.padding = '14px 18px';
            clonedEl.style.gap = '8px';
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.borderRadius = '8px';

            // Compacta levemente las celdas de patologías para que entre cómoda a ancho completo en 1 A4 vertical
            clonedEl.querySelectorAll('.ficha-patologia-table td').forEach((td) => {
              td.style.padding = '3px 8px';
            });

            // Fija dimensiones explícitas en píxeles en los logos institucionales
            const clonedImgs = Array.from(clonedEl.querySelectorAll('img'));
            clonedImgs.forEach((cImg, i) => {
              const info = imgDimensions[i];
              if (info && info.naturalWidth > 0 && info.naturalHeight > 0 && info.renderedHeight > 0) {
                const exactW = Math.round((info.naturalWidth / info.naturalHeight) * info.renderedHeight);
                cImg.style.height = `${info.renderedHeight}px`;
                cImg.style.width = `${exactW}px`;
                cImg.style.objectFit = 'fill';
              }
            });
          }
        });

        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        const pageWidth = pdf.internal.pageSize.getWidth();   // 210 mm
        const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
        const margin = 4; // margen mínimo de impresión (4 mm)

        const contentWidthMm = pageWidth - margin * 2;   // 202 mm (casi el 100% de la hoja)
        const contentHeightMm = pageHeight - margin * 2; // 289 mm

        const widthRatio = contentWidthMm / canvas.width;
        const scaledHeightMm = canvas.height * widthRatio;

        // Si cabe en 1 hoja A4 vertical (o con una tolerancia mínima ≤ 4%), ocupa toda la hoja sin partirse
        if (scaledHeightMm <= contentHeightMm * 1.04) {
          const fitRatio = Math.min(widthRatio, contentHeightMm / canvas.height);
          const finalW = canvas.width * fitRatio;
          const finalH = canvas.height * fitRatio;
          const offsetX = (pageWidth - finalW) / 2;
          const offsetY = (pageHeight - finalH) / 2;
          const imgData = canvas.toDataURL('image/jpeg', 0.88);
          pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalW, finalH, undefined, 'FAST');
        } else {
          // Si tiene observaciones médicas muy extensas que superan 1 carilla, pagina manteniendo el 100% del ancho
          const pageHeightPx = Math.floor(contentHeightMm / widthRatio);
          let currentYPx = 0;
          let pageNum = 0;

          while (currentYPx < canvas.height) {
            if (pageNum > 0) pdf.addPage();
            const sliceHeightPx = Math.min(pageHeightPx, canvas.height - currentYPx);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeightPx;
            const ctx = sliceCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, sliceHeightPx);
            ctx.drawImage(
              canvas,
              0,
              currentYPx,
              canvas.width,
              sliceHeightPx,
              0,
              0,
              canvas.width,
              sliceHeightPx
            );

            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.88);
            const sliceScaledHeight = sliceHeightPx * widthRatio;
            pdf.addImage(sliceData, 'JPEG', margin, margin, contentWidthMm, sliceScaledHeight, undefined, 'FAST');

            currentYPx += sliceHeightPx;
            pageNum++;
          }
        }

        pdf.save(`Ficha_Medica_${nino.apellido_nombre || 'Colonia'}_DNI_${nino.dni}.pdf`);
      } else {
        // ── LANDSCAPE: una sola página con fit proporcional (sin cambios) ──
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 1200
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4', compress: true });

        const pageWidth  = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 6;

        const maxWidth  = pageWidth  - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        const ratio       = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
        const finalWidth  = canvas.width  * ratio;
        const finalHeight = canvas.height * ratio;
        const offsetX     = (pageWidth  - finalWidth)  / 2;
        const offsetY     = (pageHeight - finalHeight) / 2;

        pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalWidth, finalHeight, undefined, 'FAST');
        pdf.save(`Ficha_Medica_${nino.apellido_nombre || 'Colonia'}_DNI_${nino.dni}.pdf`);
      }
    } catch (err) {
      alert('No se pudo generar el PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Bloque reutilizable: Datos del Padre/Tutor
  // ──────────────────────────────────────────────────────────────
  const SeccionPadre = () => (
    <div
      style={{
        padding: '9px 11px',
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        fontSize: '0.8rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <div style={{ fontSize: '0.78rem' }}>
          <strong style={{ textDecoration: 'underline' }}>Autorización:</strong>{' '}
          Autorizo al equipo de Salud de la Municipalidad de Valle Viejo a realizarle a mi hijo/a un control de niño sano.
        </div>
        <div style={{ display: 'flex', gap: '6px', fontWeight: 700, flexShrink: 0 }}>
          <span style={{ border: '1.5px solid #0f172a', padding: '2px 8px', fontSize: '0.76rem', background: Number(ficha.autorizado) === 1 ? '#bae6fd' : '#fff' }}>
            SI {Number(ficha.autorizado) === 1 ? '✔' : ''}
          </span>
          <span style={{ border: '1.5px solid #0f172a', padding: '2px 8px', fontSize: '0.76rem', background: Number(ficha.autorizado) === 0 ? '#fecaca' : '#fff' }}>
            NO {Number(ficha.autorizado) === 0 ? '✔' : ''}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div>
          <strong>Apellido y nombre del padre/ madre o tutor:</strong>{' '}
          <span className="ficha-dotted-value">{padre.apellido_nombre}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <span><strong>D.N.I.:</strong> <span className="ficha-dotted-value">{padre.dni}</span></span>
          <span><strong>Parentesco:</strong> <span className="ficha-dotted-value">{padre.parentesco}</span></span>
        </div>
        <div>
          <strong>Contacto de urgencia:</strong>{' '}
          <span className="ficha-dotted-value" style={{ color: '#b91c1c' }}>{padre.contacto_urgencia}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <span><strong>Tel/WhatsApp:</strong> <span className="ficha-dotted-value">{padre.telefono}</span></span>
          <span><strong>Email:</strong> <span className="ficha-dotted-value">{padre.email}</span></span>
        </div>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────
  // Bloque reutilizable: Datos del Niño
  // ──────────────────────────────────────────────────────────────
  const SeccionNino = () => (
    <div
      style={{
        padding: '10px 12px',
        border: '1px solid #94a3b8',
        borderRadius: '8px',
        fontSize: '0.8rem',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '6px', color: '#006494' }}>
        Datos del niño/a o adolescente (a completar por personal de salud):
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div>
          <strong>Apellido y nombre:</strong>{' '}
          <span className="ficha-dotted-value" style={{ fontSize: '0.88rem' }}>{nino.apellido_nombre}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <span><strong>Edad:</strong> <span className="ficha-dotted-value">{nino.edad} años</span></span>
          <span><strong>Fecha de nacimiento:</strong>{' '}<span className="ficha-dotted-value">{nino.fecha_nacimiento}</span></span>
          <span><strong>D.N.I.:</strong> <span className="ficha-dotted-value">{nino.dni}</span></span>
        </div>
        <div>
          <strong>Obra Social:</strong>{' '}
          <span style={{ fontWeight: 700 }}>{Number(nino.tiene_obra_social) === 1 ? 'SI' : 'NO'}</span>
          {'   '}
          <strong>¿Cuál?:</strong>{' '}
          <span className="ficha-dotted-value">
            {Number(nino.tiene_obra_social) === 1 ? nino.obra_social_nombre : 'No posee'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ flex: 1 }}><strong>Domicilio:</strong> <span className="ficha-dotted-value">{nino.domicilio}</span></span>
          <span><strong>Nº Tel.:</strong> <span className="ficha-dotted-value">{nino.telefono_nino || padre.telefono}</span></span>
        </div>
        <div>
          <strong>Esquema de Vacunación:</strong>{' '}
          <span className="ficha-dotted-value">{nino.esquema_vacunacion || 'Completo'}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <span><strong>Presión Arterial:</strong>{' '}<span className="ficha-dotted-value">{nino.presion_arterial || '-'}</span></span>
          <span><strong>Peso:</strong> <span className="ficha-dotted-value">{nino.peso ? `${nino.peso} kg` : '-'}</span></span>
          <span><strong>Talla:</strong> <span className="ficha-dotted-value">{nino.talla ? `${nino.talla} cm` : '-'}</span></span>
          <span><strong>IMC:</strong> <span className="ficha-dotted-value">{nino.imc || '-'}</span></span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <span>
            <strong>Circunferencia de cintura:</strong>{' '}
            <span className="ficha-dotted-value">{nino.circunferencia_cintura ? `${nino.circunferencia_cintura} cm` : '-'}</span>
          </span>
          <span><strong>Alta:</strong> <span className="ficha-dotted-value">{nino.presion_alta || '-'}</span></span>
          <span><strong>Baja:</strong> <span className="ficha-dotted-value">{nino.presion_baja || '-'}</span></span>
        </div>
        <div>
          <strong>Antecedentes personales de salud:</strong>{' '}
          <span className="ficha-dotted-value">{medica.antecedentes_personales || 'Sin antecedentes relevantes'}</span>
        </div>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────
  // Bloque reutilizable: Tabla de Patologías + firmas
  // ──────────────────────────────────────────────────────────────
  const SeccionPatologias = () => (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
      <div>
        <div style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
          <strong>Recibe atención médica:</strong>{' '}
          <span className="ficha-dotted-value">
            {Number(medica.recibe_atencion_medica) === 1
              ? `SÍ (${medica.atencion_medica_detalle || 'En control'})`
              : 'NO'}
          </span>
        </div>

        <table className="ficha-patologia-table">
          <thead>
            <tr>
              <th style={{ width: '32%' }}>¿Padece alguna de estas patologías?</th>
              <th style={{ width: '9%', textAlign: 'center' }}>SI</th>
              <th style={{ width: '9%', textAlign: 'center' }}>No</th>
              <th style={{ width: '50%' }}>¿Cuál?</th>
            </tr>
          </thead>
          <tbody>
            {PATOLOGIAS_LIST.map((pat) => {
              const isSi = Number(medica[`${pat.key}_si`]) === 1;
              const cual = medica[`${pat.key}_cual`] || '';
              return (
                <tr key={pat.key} style={isSi ? { background: '#fff1f2', fontWeight: 700 } : undefined}>
                  <td>{pat.label}</td>
                  <td style={{ textAlign: 'center', color: isSi ? '#be123c' : '#64748b', fontWeight: 800 }}>
                    {isSi ? 'X' : ''}
                  </td>
                  <td style={{ textAlign: 'center', color: !isSi ? '#0f172a' : '#94a3b8' }}>
                    {!isSi ? 'X' : ''}
                  </td>
                  <td style={{ color: isSi ? '#9f1239' : '#475569' }}>{cual}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '8px', fontSize: '0.79rem' }}>
          <strong style={{ textDecoration: 'underline' }}>Observaciones:</strong>{' '}
          <span className="ficha-dotted-value" style={{ width: '100%', padding: '3px 6px' }}>
            {medica.observaciones || 'Ninguna observación adicional.'}
          </span>
        </div>
      </div>

      <div>
        <p
          style={{
            fontStyle: 'italic',
            fontSize: '0.72rem',
            lineHeight: 1.35,
            color: '#334155',
            background: '#f8fafc',
            padding: '6px 9px',
            borderRadius: '6px',
            border: '1px dashed #cbd5e1',
            marginBottom: '14px'
          }}
        >
          Es necesario aclarar y notificar a los Sres. Padres y/o Tutores que la Municipalidad de Valle Viejo, así como
          los distintos grupos de trabajo conformados para llevar a cabo las actividades de la colonia de verano
          2025, no se hacen responsables de la pérdida de: vestimenta, dinero, dispositivos electrónicos, celulares y
          otros objetos que su hijo/a llegara a extraviar.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', textAlign: 'center' }}>
          <div>
            <div style={{ borderBottom: '1.5px solid #334155', minHeight: '22px', fontFamily: 'cursive, serif', fontSize: '0.88rem', color: '#006494' }}>
              {ficha.firma_profesional_texto || ''}
            </div>
            <div style={{ marginTop: '3px', fontWeight: 600, fontSize: '0.76rem' }}>Firma del Profesional de la Salud</div>
          </div>
          <div>
            <div style={{ borderBottom: '1.5px solid #334155', minHeight: '22px', fontFamily: 'cursive, serif', fontSize: '0.88rem', color: '#0f172a' }}>
              {ficha.firma_padre_texto || padre.apellido_nombre}
            </div>
            <div style={{ marginTop: '3px', fontWeight: 600, fontSize: '0.76rem' }}>Firma Padre y/o Tutor</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────
  // Cabecera común (sede + turno)
  // ──────────────────────────────────────────────────────────────
  const SedeBar = () => (
    <div
      style={{
        marginTop: '8px',
        background: '#f1f5f9',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '0.82rem',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        border: '1px solid #cbd5e1'
      }}
    >
      <span>
        <strong>Colonia / Localidad:</strong> {ficha.colonia_nombre || 'Colonia Municipal Valle Viejo'} ({ficha.colonia_sede || 'Valle Viejo'})
      </span>
      <span>
        <strong>Turno:</strong> {ficha.colonia_turno || 'Mañana'}
      </span>
    </div>
  );

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Regla @page dinámica para que también al imprimir directo desde el navegador
          salga A4 Vertical sin márgenes grandes SOLO en mobile, y A4 Horizontal en desktop */}
      <style>
        {isMobile
          ? '@page { size: A4 portrait; margin: 4mm; }'
          : '@page { size: A4 landscape; margin: 6mm; }'}
      </style>

      {/* Toolbar de acciones (sólo en vista admin) */}
      {!hideAdminToolbar && (
        <div
          className="no-print"
          style={{
            background: '#ffffff',
            borderRadius: isMobile ? '18px' : '20px',
            padding: isMobile ? '14px 12px' : '16px 20px',
            marginBottom: isMobile ? '14px' : '20px',
            boxShadow: 'var(--md-sys-elevation-2)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: isMobile ? '12px' : '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {showBackButton && onBack && (
              <button
                className="md3-btn md3-btn-tonal"
                onClick={onBack}
                style={{ padding: isMobile ? '7px 12px' : '8px 14px', fontSize: isMobile ? '0.84rem' : undefined, flexShrink: 0 }}
              >
                <ArrowLeft size={isMobile ? 16 : 18} /> Volver
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: isMobile ? '0.7rem' : '0.78rem', fontWeight: 700, color: '#006494', textTransform: 'uppercase', display: 'block' }}>
                Ficha Médica Oficial
              </span>
              <h3
                className="font-display"
                style={{
                  fontSize: isMobile ? '1rem' : '1.18rem',
                  color: '#0f172a',
                  lineHeight: 1.25,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {nino.apellido_nombre} • DNI {nino.dni}
              </h3>
            </div>
          </div>

          <div
            style={
              isMobile
                ? {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '6px'
                  }
                : {
                    display: 'flex',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    gap: '8px'
                  }
            }
          >
            <a
              href={`tel:${telUrgencia}`}
              className="md3-btn"
              style={
                isMobile
                  ? {
                      background: '#ba1a1a',
                      color: '#fff',
                      height: '40px',
                      padding: '0 6px',
                      gap: '5px',
                      fontSize: '0.78rem',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap'
                    }
                  : { background: '#ba1a1a', color: '#fff', whiteSpace: 'nowrap' }
              }
            >
              <Phone size={isMobile ? 15 : 18} style={{ flexShrink: 0 }} />
              <span>{isMobile ? 'Urgencia' : 'Llamar Contacto Urgencia'}</span>
            </a>

            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                `Hola ${padre.apellido_nombre}, nos comunicamos de la Colonia de Verano (${ficha.colonia_nombre}) de la Municipalidad de Valle Viejo por ${nino.apellido_nombre}.`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="md3-btn md3-btn-success"
              style={
                isMobile
                  ? {
                      height: '40px',
                      padding: '0 6px',
                      gap: '5px',
                      fontSize: '0.78rem',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap'
                    }
                  : { whiteSpace: 'nowrap' }
              }
            >
              <MessageCircle size={isMobile ? 15 : 18} style={{ flexShrink: 0 }} />
              <span>{isMobile ? 'WhatsApp' : 'WhatsApp al Padre'}</span>
            </a>

            <button
              className="md3-btn md3-btn-filled"
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              style={
                isMobile
                  ? {
                      height: '40px',
                      padding: '0 6px',
                      gap: '5px',
                      fontSize: '0.78rem',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap'
                    }
                  : { whiteSpace: 'nowrap' }
              }
            >
              <Download size={isMobile ? 15 : 18} style={{ flexShrink: 0 }} />
              <span>
                {generatingPdf
                  ? isMobile
                    ? 'PDF...'
                    : 'Generando Planilla...'
                  : isMobile
                    ? 'Descargar'
                    : 'Descargar Planilla'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          PLANILLA — MOBILE: 1 columna vertical (Portrait)
          ═══════════════════════════════════════════════════════════ */}
      {isMobile ? (
        <div ref={sheetRef} className="ficha-vertical-sheet">
          <HeaderValleViejo
            compact={true}
            nroFicha={ficha.nro_ficha}
            fecha={(ficha.fecha_inscripcion || '').slice(0, 10)}
          />

          <SedeBar />

          {/* Texto introductorio */}
          <div style={{ fontSize: '0.76rem', lineHeight: 1.38, color: '#1e293b' }}>
            <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '3px' }}>
              Control de Salud Integral:
            </div>
            <p style={{ textAlign: 'justify', margin: 0 }}>
              Sres. Padres y/o tutores a continuación les solicitamos que completen la autorización y brinden la siguiente
              información que será de utilidad para que el equipo de la Subsecretaría de Deportes tenga en consideración
              a la hora de planificar y llevar a cabo actividades deportivas y/o recreativas en lo que dure el período de la
              colonia 2025. De igual forma la información proporcionada, puesta a disposición del equipo de Salud de la
              Municipalidad de Valle Viejo para un control integral de la salud de su niño, niña o adolescente. Los datos
              aquí dispuestos por usted serán resguardados con total discreción y confidencialidad.
            </p>
          </div>

          {/* 1 columna: Padre → Niño → Patologías */}
          <SeccionPadre />
          <SeccionNino />
          <SeccionPatologias />
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════
            PLANILLA — DESKTOP: 2 columnas landscape (Horizontal)
            ═══════════════════════════════════════════════════════════ */
        <div className="ficha-scroll-wrapper">
          <div className="ficha-oficial-sheet" ref={sheetRef}>
            <HeaderValleViejo
              compact={true}
              nroFicha={ficha.nro_ficha}
              fecha={(ficha.fecha_inscripcion || '').slice(0, 10)}
            />

            <SedeBar />

            {/* Grid de 2 columnas */}
            <div className="ficha-landscape-grid">
              {/* Columna izquierda */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.38, color: '#1e293b' }}>
                  <div style={{ fontWeight: 700, textDecoration: 'underline', marginBottom: '3px' }}>
                    Control de Salud Integral:
                  </div>
                  <p style={{ textAlign: 'justify', margin: 0 }}>
                    Sres. Padres y/o tutores a continuación les solicitamos que completen la autorización y brinden la siguiente
                    información que será de utilidad para que el equipo de la Subsecretaría de Deportes tenga en consideración
                    a la hora de planificar y llevar a cabo actividades deportivas y/o recreativas en lo que dure el período de la
                    colonia 2025. De igual forma la información proporcionada, puesta a disposición del equipo de Salud de la
                    Municipalidad de Valle Viejo para un control integral de la salud de su niño, niña o adolescente. Los datos
                    aquí dispuestos por usted serán resguardados con total discreción y confidencialidad.
                  </p>
                </div>
                <SeccionPadre />
                <SeccionNino />
              </div>

              {/* Columna derecha */}
              <SeccionPatologias />
            </div>
          </div>
        </div>
      )}

      {/* Botón de descarga inferior (sólo en vista pública sin toolbar superior) */}
      {hideAdminToolbar && (
        <div
          className="no-print"
          style={{
            marginTop: '18px',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {showBackButton && onBack && (
            <button
              className="md3-btn md3-btn-tonal"
              onClick={onBack}
              style={{ padding: '13px 24px', fontSize: '0.96rem' }}
            >
              <ArrowLeft size={18} /> Volver al Formulario
            </button>
          )}
          <button
            className="md3-btn md3-btn-filled"
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            style={{ padding: '14px 28px', fontSize: '1rem' }}
          >
            <Download size={20} /> {generatingPdf ? 'Generando Planilla...' : 'Descargar Planilla'}
          </button>
        </div>
      )}
    </div>
  );
}
