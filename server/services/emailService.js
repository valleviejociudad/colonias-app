const nodemailer = require('nodemailer');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escMultiline(value) {
  return esc(value).replace(/\n/g, '<br>');
}

async function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // En producción no hay Ethereal: retornar null para que se muestre advertencia clara
  if (process.env.NODE_ENV === 'production') {
    console.error('⚠️  SMTP no configurado. Los correos de alerta NO se enviarán. Configurá SMTP_HOST, SMTP_USER y SMTP_PASS en las variables de entorno.');
    return null;
  }

  // Solo en desarrollo local: usar Ethereal (buzón de prueba)
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (e) {
    return null;
  }
}

async function enviarEmailSuspension({ destinatarios, titulo, mensaje, coloniaNombre, fecha }) {
  const transporter = await getTransporter();

  if (!transporter) {
    return { modo: 'sin_configurar', enviados: 0, fallidos: 0, previewUrl: null };
  }

  const resultados = [];
  let previewUrl = null;
  const enviados = new Set();
  for (const dest of destinatarios) {
    const email = String(dest.email || '').trim().toLowerCase();
    if (!email || enviados.has(email)) continue;
    enviados.add(email);
    const saludo = dest.nino_nombre
      ? `Hola, ${esc(dest.apellido_nombre || '')}. Te escribimos por <strong>${esc(dest.nino_nombre)}</strong>.`
      : `Hola, ${esc(dest.apellido_nombre || '')}.`;
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Colonias de Verano - Municipalidad de Valle Viejo" <deportes@valleviejo.gob.ar>',
        to: email,
        subject: `Aviso: ${titulo} · ${coloniaNombre || 'Colonias de Verano'}`,
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 14px; overflow: hidden; border: 1px solid #c6dae4; color: #0f2430;">
            <div style="background: #006494; color: #ffffff; padding: 22px 24px;">
              <p style="margin: 0; font-size: 14px;">Municipalidad de Valle Viejo · Colonias de Verano</p>
              <h2 style="margin: 6px 0 0; font-size: 21px;">Aviso${fecha ? ` del ${esc(fecha)}` : ''}</h2>
            </div>
            <div style="padding: 24px; background: #ffffff;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5;">${saludo}</p>
              <div style="background: #fff3d6; padding: 16px 18px; border-radius: 10px; margin-bottom: 18px;">
                <p style="margin: 0 0 4px; font-size: 14px; color: #3d2400;">${esc(coloniaNombre || 'Todas las localidades')}</p>
                <h3 style="margin: 0 0 8px; font-size: 18px; color: #3d2400;">${esc(titulo)}</h3>
                <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #3d2400;">${escMultiline(mensaje)}</p>
              </div>
              <p style="margin: 0; font-size: 13px; color: #5a707b;">
                Este correo lo manda el sistema de Colonias de Verano de la Municipalidad de Valle Viejo.
              </p>
            </div>
          </div>
        `
      });
      if (!previewUrl && nodemailer.getTestMessageUrl(info)) {
        previewUrl = nodemailer.getTestMessageUrl(info);
      }
      resultados.push({ email, ok: true });
    } catch (err) {
      console.error('No se pudo mandar un correo de aviso:', err.message);
      resultados.push({ email, ok: false });
    }
  }

  return {
    modo: process.env.SMTP_HOST ? 'smtp_real' : 'ethereal_test',
    enviados: resultados.filter((r) => r.ok).length,
    fallidos: resultados.filter((r) => !r.ok).length,
    previewUrl
  };
}

module.exports = {
  enviarEmailSuspension
};
