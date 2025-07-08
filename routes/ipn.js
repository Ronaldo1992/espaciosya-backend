const express = require('express');
const router = express.Router();
const { db, messaging } = require('../firebase');
const {
  getTempTransaction,
  deleteTempTransaction,
  updateTransactionStatus
} = require('../memoryStore');
const { sendEmail } = require('../utils/emailService');

router.get('/ipn-handler', async (req, res) => {
  try {
    const { orderId, status } = req.query;

    if (!orderId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros'
      });
    }

    // Verificar configuración global de correo
    let emailEnabled = false;
    try {
      const settingsSnap = await db.collection('settings').doc('config').get();
      emailEnabled = settingsSnap.exists && settingsSnap.data().email_status === true;
    } catch (err) {
      console.warn('⚠️ No se pudo leer configuración de emails en settings/config');
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

    if (!data.userRef) {
      return res.status(400).json({
        success: false,
        message: 'Falta referencia de usuario'
      });
    }

    const userDocRef = db.doc(`users/${String(data.userRef).trim()}`);
    const amountToAdd = Number(parseFloat(data.amount).toFixed(2));

    // Si es modo Booking
    if (String(data.mode).toLowerCase() === 'booking') {
      try {
        console.log('✅ Revisando datos booking:', {
          userRef: data.userRef,
          listing_id: data.listing_id,
          guest_id: data.guest_id,
          check_in: data.check_in,
          check_out: data.check_out,
          total_price: data.total_price,
          booking_status: data.booking_status,
          create_date: data.create_date
        });

        // Validar campos mínimos
        if (!data.listing_id || !data.guest_id || !data.check_in || !data.check_out || !data.total_price) {
          console.log('⚠️ Datos faltantes en booking:', data);
          return res.status(400).json({
            success: false,
            message: 'Faltan campos obligatorios para Booking'
          });
        }

        const listingRef = db.doc(`listings/${String(data.listing_id).trim()}`);
        const guestRef = db.doc(`users/${String(data.guest_id).trim()}`);

        const bookingData = {
          listing_id: listingRef,
          guest_id: guestRef,
          check_in: new Date(data.check_in),
          check_out: new Date(data.check_out),
          total_price: parseFloat(data.total_price),
          status: data.booking_status || 'Pending',
          create_date: new Date(data.create_date)
        };

        console.log('➡️ Datos a guardar en bookings:', bookingData);

        // Guardar el booking
        const bookingDocRef = await db.collection('bookings').add(bookingData);
        console.log('🎉 Nuevo booking creado con ID:', bookingDocRef.id);

        // Crear la transacción asociada
        const transaction = {
          orderId: String(orderId),
          create_date: new Date(data.create_date),
          amount: amountToAdd,
          status: 'Complete',
          payment_method: String(data.payment_method),
          type: String(data.type),
          mode: String(data.mode),
          userRef: userDocRef,
          bookingRef: bookingDocRef,
          day: parseInt(data.day, 10),
          month: parseInt(data.month, 10),
          year: parseInt(data.year, 10)
        };

        await db.collection('transactions').doc(orderId).set(transaction);
        console.log(`✅ Transacción para booking guardada: ${orderId}`);

        // Crear notificación
        const notification = {
          create_date: new Date(),
          uid: userDocRef,
          description: `Tu reserva ha sido confirmada por $${amountToAdd.toFixed(2)}.`,
          is_active: true,
          type: 'Booking',
          users: [userDocRef]
        };

        await db.collection('notifications').add(notification);
        console.log('🔔 Notificación tipo Booking creada.');

        // Enviar correo si está habilitado
        if (emailEnabled) {
          try {
            const userSnap = await userDocRef.get();
            if (userSnap.exists && userSnap.data().email && userSnap.data().displayName) {
              const userEmail = userSnap.data().email;
              const userName = userSnap.data().displayName;

              await sendEmail({
                recipients: userEmail,
                templateType: 'booking-confirmation',
                subject: '✅ ¡Tu reserva ha sido confirmada!',
                context: {
                  userName,
                  amount: amountToAdd.toFixed(2),
                  check_in: data.check_in,
                  check_out: data.check_out
                }
              });
              console.log('📧 Email de confirmación de booking enviado.');
            }
          } catch (err) {
            console.warn('⚠️ Error preparando el correo de booking:', err);
          }
        } else {
          console.log('📭 Email desactivado. No se enviará correo de booking.');
        }

      } catch (bookingError) {
        console.error('🔥 Error procesando modo Booking:', bookingError);
        return res.status(500).json({
          success: false,
          message: 'Error procesando modo Booking'
        });
      }
    }

    // ✅ Marcar completada y limpiar memoryStore
    updateTransactionStatus(orderId, 'E');
    setTimeout(() => {
      deleteTempTransaction(orderId);
      console.log(`🧹 Transacción ${orderId} eliminada de memoryStore tras 1 minuto.`);
    }, 60000);

    return res.json({ success: true });

  } catch (error) {
    console.error('🔥 Error general en IPN:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno en IPN'
    });
  }
});

module.exports = router;
