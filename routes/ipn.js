const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { sendEmail } = require('../utils/emailService');
const { getTempTransaction, updateTransactionStatus } = require('../memoryStore');

// 🔁 Función para generar ID aleatorio de 20 caracteres
function generateFirestoreId(length = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// 🔁 Función para validar fecha
function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

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
      updateTransactionStatus(orderId, status);
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
      !data.checkin ||
      !data.checkout ||
      !data.total_price
    ) {
      console.warn(`⚠️ Datos incompletos para booking con orderId ${orderId}`);
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para Booking'
      });
    }

    const bookingId = generateFirestoreId();

    const bookingData = {
      orderID: String(orderId),
      confirmation_code: data.confirmation_code,
      create_date: new Date(data.create_date),
      total_price: parseFloat(data.total_price),
      payment_method: String(data.payment_method),
      type: String(data.type),
      userRef: db.doc(`users/${String(data.userRef).trim()}`),
      listingRef: db.doc(`listings/${String(data.listingRef).trim()}`),
      date_reserved: data.date_reserved ? new Date(data.date_reserved) : new Date(),
      checkin: new Date(data.checkin),
      checkout: new Date(data.checkout),
      guest: parseInt(data.guest, 10) || 1,
      booking_per: data.booking_per || 'daily',
      status: 'Active'
    };

    await db.collection('bookings').doc(bookingId).set(bookingData);
    console.log('🎉 Booking creado con éxito:', bookingData);

    updateTransactionStatus(orderId, status);

    // ✉️ Preparar y enviar correos
    try {
      const userSnap = await db.doc(`users/${String(data.userRef).trim()}`).get();

      if (userSnap.exists) {
        const user = userSnap.data();
        const userEmail = user.email;
        const userName = user.displayName || 'Usuario';

        const checkinDate = new Date(data.checkin);
        const checkoutDate = new Date(data.checkout);

        const eventDate = isValidDate(checkinDate)
          ? checkinDate.toLocaleDateString('es-PA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          : 'Fecha no disponible';

        const startTime = isValidDate(checkinDate)
          ? checkinDate.toLocaleTimeString('es-PA', {
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Inicio desconocido';

        const endTime = isValidDate(checkoutDate)
          ? checkoutDate.toLocaleTimeString('es-PA', {
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Fin desconocido';

        const emailContext = {
          userName,
          spaceName: data.spaceName || 'Espacio reservado',
          eventDate,
          startTime,
          endTime,
          capacity: parseInt(data.guest, 10) || 1,
          totalPrice: parseFloat(data.total_price).toFixed(2),
          paymentMethod: data.payment_method || 'Pago',
          bookingNumber: data.confirmation_code
        };

        // Usuario
        if (userEmail) {
          await sendEmail({
            recipients: userEmail,
            templateType: 'booking-confirmation',
            subject: '✅ ¡Tu reserva ha sido confirmada!',
            context: emailContext
          });
          console.log(`📧 Email enviado al usuario ${userEmail}`);
        }

        // Admin
        const adminEmail = 'rombar24@gmail.com';
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
