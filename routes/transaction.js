const express = require('express');
const router = express.Router();
const { saveTempTransaction } = require('../memoryStore');

router.post('/transaction', (req, res) => {
  try {
    const {
      orderId,
      create_date,
      total_price,
      payment_method,
      type,
      userRef,
      listingRef,
      guest,
      checkin,
      checkout,
      status,
      booking_per,
      date_reserved,
      confirmation_code // ✅ <-- incluir este campo
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Falta orderId' });
    }

    const tempData = {
      orderId,
      create_date,
      total_price,
      payment_method,
      type,
      userRef,
      listingRef,
      guest,
      checkin,
      checkout,
      booking_status: status,
      booking_per,
      date_reserved,
      confirmation_code // ✅ <-- guardar en memoria
    };

    saveTempTransaction(orderId, tempData);

    console.log(`🧠 Orden ${orderId} guardada temporalmente:`, tempData);
    res.status(200).json({ message: 'Transacción almacenada temporalmente.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al guardar en memoria' });
  }
});

module.exports = router;





