const express = require('express');
const router = express.Router();
const { saveTempTransaction } = require('../memoryStore');

router.post('/transaction', (req, res) => {
  try {
    const {
      orderId,
      create_date,
      amount,
      payment_method,
      type,
      userRef,
      bookingRef,
      day,
      month,
      year,
      mode,
      // Campos específicos de booking:
      listing_id,
      guest_id,
      check_in,
      check_out,
      total_price,
      status
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Falta orderId' });
    }

    // Construir el objeto de datos a guardar
    const tempData = {
      create_date,
      amount,
      status: 'P', // transacción pendiente
      payment_method,
      type,
      userRef,
      bookingRef,
      day,
      month,
      year,
      mode
    };

    // ✅ Guardar campos de booking si existen
    if (mode && String(mode).toLowerCase() === 'booking') {
      tempData.listing_id = listing_id;
      tempData.guest_id = guest_id;
      tempData.check_in = check_in;
      tempData.check_out = check_out;
      tempData.total_price = total_price;
      tempData.booking_status = status;
    }

    saveTempTransaction(orderId, tempData);

    console.log(`🧠 Orden ${orderId} guardada temporalmente:`, tempData);
    res.status(200).json({ message: 'Transacción almacenada temporalmente.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar en memoria' });
  }
});

module.exports = router;


