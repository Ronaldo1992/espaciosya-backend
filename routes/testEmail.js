const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { sendEmail } = require('../utils/emailService');

router.get('/test-email', async (req, res) => {
  const to = req.query.to;
  if (!to) {
    return res.status(400).json({ success: false, message: 'Falta el parámetro "to"' });
  }

  // Verificar configuración global
  let emailEnabled = false;
  try {
    const settingsSnap = await db.collection('settings').doc('config').get();
    emailEnabled = settingsSnap.exists && settingsSnap.data().email_status === true;
  } catch (err) {
    console.warn('⚠️ No se pudo leer settings/config');
  }

  if (!emailEnabled) {
    return res.status(200).json({ success: false, message: '📭 Email desactivado desde configuración' });
  }

  try {
    await sendEmail({
      recipients: to,
      templateType: 'payment-notification',
      subject: '💰 Prueba de notificación de contribución',
      context: {
        goalTitle: 'Viaje a Japón',
        payerName: 'Usuario de prueba',
        amount: '25.00'
      }
    });

    return res.status(200).json({ success: true, message: `📧 Correo enviado a ${to}` });
  } catch (err) {
    console.error('🔥 Error enviando correo de prueba:', err);
    return res.status(500).json({ success: false, message: 'Error enviando correo de prueba' });
  }
});

module.exports = router;
