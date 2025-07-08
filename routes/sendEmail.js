const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/emailService');

router.post('/send-email', async (req, res) => {
  const { mode, to, name, pincode, email, amount } = req.body;

  if (!mode) {
    return res.status(400).json({ success: false, message: 'Falta el parámetro "mode"' });
  }

  try {
    // 👋 Bienvenida
    if (mode === 'welcome') {
      if (!to || !name) {
        return res.status(400).json({ success: false, message: 'Faltan "to" o "name"' });
      }

      await sendEmail({
        recipients: to,
        templateType: 'welcome',
        subject: `👋 Bienvenido a EspaciosYa, ${name}!`,
        context: { name }
      });

      return res.status(200).json({ success: true, message: `Correo de bienvenida enviado a ${to}` });
    }

    // 🔐 Código PIN
if (mode === 'codepinemail') {
  if (!to || !pincode) {
    return res.status(400).json({ success: false, message: 'Faltan "to" o "pincode"' });
  }

  await sendEmail({
    recipients: to,
    templateType: 'codepin',
    subject: '🔐 Tu código PIN de seguridad',
    context: { pincode }
  });

  return res.status(200).json({ success: true, message: `Correo con PIN enviado a ${to}` });
}

    // 🆕 Nuevo usuario registrado (correo al admin)
    if (mode === 'newuser') {
      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Faltan "name" o "email"' });
      }

      const adminEmail = 'rombar24@gmail.com'; // Cambia esto si deseas otro admin

      await sendEmail({
        recipients: adminEmail,
        templateType: 'newuser',
        subject: '🆕 Nuevo usuario registrado en EspaciosYa',
        context: { name, email }
      });

      return res.status(200).json({ success: true, message: 'Correo enviado al administrador' });
    }

    // 💸 Solicitud de retiro (usuario + admin)
    if (mode === 'withdrawal') {
      if (!to || !name || !amount) {
        return res.status(400).json({ success: false, message: 'Faltan "to", "name" o "amount"' });
      }

      // 1. Enviar al usuario
      await sendEmail({
        recipients: to,
        templateType: 'withdrawal-user',
        subject: 'Tu solicitud de retiro ha sido recibida 🧾',
        context: { userName: name, amount }
      });

      // 2. Enviar al admin
      const adminEmail = 'rombar24@gmail.com'; // Actualiza si deseas otro correo

      await sendEmail({
        recipients: adminEmail,
        templateType: 'withdrawal-admin',
        subject: 'Nuevo retiro solicitado',
        context: { userName: name, userEmail: to, amount }
      });

      return res.status(200).json({ success: true, message: 'Correos de retiro enviados correctamente' });
    }

    return res.status(400).json({ success: false, message: 'Modo no soportado' });

  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    return res.status(500).json({ success: false, message: 'Error enviando el correo' });
  }
});

module.exports = router;
