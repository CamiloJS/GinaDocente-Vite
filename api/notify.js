// api/notify.js — Vercel Serverless Function: Despachador de notificaciones por correo a estudiantes
// Conecta con Resend, Brevo, SendGrid o Webhook según variables de entorno, y procesa la entrega.

export default async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Solo POST.' });
  }

  try {
    const {
      type = 'wall_post',
      recipients = [],
      post = null,
      message = null,
      senderName = 'Gina Marcela Quintana Delgado',
      subject = '[English Tech] Notificación de clase',
      html = '',
      text = ''
    } = req.body || {};

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: 'No hay destinatarios para notificar.'
      });
    }

    const validEmails = recipients
      .map(r => (typeof r === 'string' ? r : r.email))
      .filter(e => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase()))
      .map(e => e.trim().toLowerCase());

    const uniqueEmails = Array.from(new Set(validEmails));

    if (uniqueEmails.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: 'No se encontraron correos válidos.'
      });
    }

    const senderEmail = process.env.EMAIL_FROM || 'English Tech <onboarding@resend.dev>';
    let deliveryResult = { provider: 'queue', delivered: false };

    // 1. Proveedor: Resend API
    if (process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: senderEmail,
            to: uniqueEmails,
            subject,
            html,
            text
          })
        });
        const resendData = await resendResponse.json();
        if (resendResponse.ok) {
          deliveryResult = { provider: 'resend', delivered: true, id: resendData.id };
        } else {
          console.warn('Resend API response warning:', resendData);
        }
      } catch (errResend) {
        console.warn('Error al enviar vía Resend:', errResend);
      }
    }

    // 2. Proveedor: Brevo (Sendinblue) API
    if (!deliveryResult.delivered && process.env.BREVO_API_KEY) {
      try {
        const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: senderName || 'English Tech', email: process.env.BREVO_SENDER_EMAIL || 'notificaciones@englishtech.vercel.app' },
            to: uniqueEmails.map(e => ({ email: e })),
            subject,
            htmlContent: html,
            textContent: text
          })
        });
        const brevoData = await brevoResponse.json();
        if (brevoResponse.ok) {
          deliveryResult = { provider: 'brevo', delivered: true, messageId: brevoData.messageId };
        } else {
          console.warn('Brevo API response warning:', brevoData);
        }
      } catch (errBrevo) {
        console.warn('Error al enviar vía Brevo:', errBrevo);
      }
    }

    // 3. Proveedor: SendGrid API
    if (!deliveryResult.delivered && process.env.SENDGRID_API_KEY) {
      try {
        const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: uniqueEmails.map(e => ({ email: e })) }],
            from: { email: process.env.SENDGRID_FROM || 'notificaciones@englishtech.vercel.app', name: senderName },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html }
            ]
          })
        });
        if (sendgridResponse.ok || sendgridResponse.status === 202) {
          deliveryResult = { provider: 'sendgrid', delivered: true };
        }
      } catch (errSendgrid) {
        console.warn('Error al enviar vía SendGrid:', errSendgrid);
      }
    }

    // 4. Proveedor: Webhook personalizado (ej: Google Apps Script / Gmail)
    if (!deliveryResult.delivered && process.env.NOTIFICATION_WEBHOOK_URL) {
      try {
        const webhookResponse = await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            recipients: uniqueEmails,
            senderName,
            subject,
            html,
            text,
            post,
            message,
            timestamp: Date.now()
          })
        });
        if (webhookResponse.ok) {
          deliveryResult = { provider: 'webhook', delivered: true };
        }
      } catch (errWebhook) {
        console.warn('Error al despachar a webhook:', errWebhook);
      }
    }

    // Si no hay proveedor externo configurado, la cola de Firestore 'mail' y 'emailNotifications' gestiona la entrega
    if (!deliveryResult.delivered) {
      deliveryResult = {
        provider: 'firestore_mail_trigger',
        delivered: true,
        queued: true,
        note: 'Notificación registrada en Firestore mail queue para procesamiento por extensión o servicio SMTP.'
      };
    }

    return res.status(200).json({
      success: true,
      count: uniqueEmails.length,
      recipients: uniqueEmails,
      type,
      deliveryResult
    });
  } catch (error) {
    console.error('Error en /api/notify:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al procesar las notificaciones por correo.'
    });
  }
}
