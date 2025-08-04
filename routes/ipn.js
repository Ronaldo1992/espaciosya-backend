const express = require('express');
const router = express.Router();
const { db } = require('../firebase');  
const { sendEmail } = require('../utils/emailService');

const {
  getTempTransaction,
  deleteTempTransaction
} = require('../memoryStore');

router.get('/ipn-handler', async (req, res) => {
  try {
    const { orderId, status } = req.query;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros'
      });
    }

    if (status !== 'E') {
      deleteTempTransaction(orderId);
      console.log(`❌ Orden ${orderId} rechazada/cancelada/expirada (${status}).`);
      return res.status(200).json({ success: true });
    }

    const entry = getTempTransaction(orderId);

    if (!entry) {
      console.warn(`⚠️ No se encontró data temporal para ${orderId}`);
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada en memoria'
      });
    }

    const data = entry.data;

    if (
      !data.userRef ||
      !data.listingRef ||
      !data.check_in ||
      !data.check_out ||
      !data.total_price
    ) {
      console.warn(`⚠️ Datos incompletos para booking con orderId ${orderId}`);
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para Booking'
      });
    }

    const bookingData = {
      orderId: String(orderId),
      create_date: new Date(data.create_date),
      total_price: parseFloat(data.total_price),
      payment_method: String(data.payment_method),
      type: String(data.type),
      userRef: db.doc(`users/${String(data.userRef).trim()}`),
      listingRef: db.doc(`listings/${String(data.listingRef).trim()}`),
      date_reserved: data.date_reserved ? new Date(data.date_reserved) : new Date(),
      checkin: new Date(data.check_in),
      checkout: new Date(data.check_out),
      guest: parseInt(data.guest, 10) || 1,
      booking_per: data.booking_per || 'daily',
      status: data.booking_status || 'Confirmed'
    };

    await db.collection('bookings').doc(orderId).set(bookingData);

// Obtener datos del usuario para el correo
try {
  const userSnap = await db.doc(`users/${String(data.userRef).trim()}`).get();

  if (userSnap.exists) {
    const user = userSnap.data();
    const userEmail = user.email;
    const userName = user.displayName || 'Usuario';

    const emailContext = {
      userName,
      amount: parseFloat(data.total_price).toFixed(2),
      check_in: data.check_in,
      check_out: data.check_out
    };

    // 📧 Enviar correo al usuario
    if (userEmail) {
      await sendEmail({
        recipients: userEmail,
        templateType: 'booking-confirmation',
        subject: '✅ ¡Tu reserva ha sido confirmada!',
        context: emailContext
      });
      console.log(`📧 Email enviado al usuario ${userEmail}`);
    }

    // 📧 Enviar correo al admin
    const adminEmail = 'rombar24@gmail.com'; // <-- CAMBIA esto por el correo real de admin
    await sendEmail({
      recipients: adminEmail,
      templateType: 'booking-confirmation',
      subject: `📥 Nueva reserva confirmada - ${userName}`,
      context: emailContext
    });
    console.log(`📧 Email enviado al administrador`);
  }

} catch (emailErr) {
  console.warn('⚠️ Error enviando correos:', emailErr);
}


    console.log('🎉 Booking creado con éxito:', bookingData);

    deleteTempTransaction(orderId);
    return res.json({ success: true });

  } catch (error) {
    console.error('🔥 Error en IPN:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno'
    });
  }
});

module.exports = router;

