const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

router.post('/change-password', async (req, res) => {
  const { uid, password } = req.body;

  if (!uid || !password) {
    return res.status(400).json({ success: false, message: 'Faltan uid o password' });
  }

  try {
    await admin.auth().updateUser(uid, { password });
    console.log(`🔒 Contraseña actualizada para UID: ${uid}`);
    return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error actualizando contraseña:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
