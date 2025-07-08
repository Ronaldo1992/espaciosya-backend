const express = require('express');
const router = express.Router();
const { getTempTransaction } = require('../memoryStore');

router.get('/check-transaction', (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    console.warn('⚠️ Request received without orderId');
    return res.status(400).json({
      success: false,
      message: 'Falta orderId',
      status: 'X'
    });
  }

  const entry = getTempTransaction(orderId);

  if (!entry) {
    console.warn(`⚠️ Transaction not found: ${orderId}`);
    return res.status(404).json({
      success: false,
      message: 'Transacción no encontrada o expirada',
      status: 'X'
    });
  }

  const status = entry.data.status || 'P'; // Fix: Access entry.data.status

  console.log(`✅ Transaction found in memoryStore: ${orderId}, status: ${status}`);
  return res.json({
    success: true,
    orderId,
    status
  });
});

module.exports = router;


