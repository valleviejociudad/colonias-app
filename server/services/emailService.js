const nodemailer = require('nodemailer');

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

  // Fallback to Ethereal test account for local development without credentials
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

async function enviarEmailSuspension({ destinatarios, titulo, mensaje, coloniaNombre }) {
  const transporter = await getTransporter();
  const resultados = [];

  if (!transporter) {
    return {
      modo: 'simulado_local',
      enviados: destinatarios.length,
      previewUrl: null
    };
  }

  let previewUrl = null;
  for (const dest of destinatarios) {
    if (!dest.email) continue;
    try {
      const info = await transporter.sendMail({
        from: '"Colonias de Verano - Municipalidad de Valle Viejo" <deportes@valleviejo.gob.ar>',
        to: dest.email,
        subject: `⚠️ AVISO IMPORTANTE: ${titulo} - ${coloniaNombre || 'Colonias de Verano'}`,
        html: `
          <div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e0e0e0;">
            <div style="background: linear-gradient(135deg, #006494, #00a6fb); color: white; padding: 24px; text-align: center;">
              <h2 style="margin: 0; font-size: 22px;">Municipalidad de Valle Viejo</h2>
              <p style="margin: 6px 0 0; opacity: 0.9;">Subsecretaría de Deportes • Colonias de Verano</p>
            </div>
            <div style="padding: 24px; background: #ffffff;">
              <div style="background: #fff3cd; border-left: 5px solid #ff9800; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 8px; color: #b26a00;">${titulo}</h3>
                <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.5;">${mensaje}</p>
              </div>
              <p style="color: #555; font-size: 14px;">
                Estimado/a <strong>${dest.apellido_nombre || 'Padre/Madre/Tutor'}</strong>, le enviamos este comunicado oficial respecto a la localidad <strong>${coloniaNombre || 'Todas las localidades'}</strong>.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
                Este es un mensaje automático del Sistema Digital de Colonias de Verano • Municipalidad de Valle Viejo.
              </p>
            </div>
          </div>
        `
      });
      if (!previewUrl && nodemailer.getTestMessageUrl(info)) {
        previewUrl = nodemailer.getTestMessageUrl(info);
      }
      resultados.push({ email: dest.email, ok: true });
    } catch (err) {
      resultados.push({ email: dest.email, ok: false, error: err.message });
    }
  }

  return {
    modo: process.env.SMTP_HOST ? 'smtp_real' : 'ethereal_test',
    enviados: resultados.filter(r => r.ok).length,
    previewUrl
  };
}

module.exports = {
  enviarEmailSuspension
};
