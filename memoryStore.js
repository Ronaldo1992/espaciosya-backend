const store = new Map();

function saveTempTransaction(orderId, data, ttlMs = 5 * 60 * 1000) {
  const timeout = setTimeout(() => {
    store.delete(orderId);
    console.log(`⏳ Orden expirada: ${orderId}`);
  }, ttlMs);

  store.set(orderId, { data, timeout });
}

function getTempTransaction(orderId) {
  return store.get(orderId) || null; // devuelve data y timeout
}

function deleteTempTransaction(orderId) {
  const entry = store.get(orderId);
  if (entry) {
    clearTimeout(entry.timeout);
    store.delete(orderId);
  }
}

function updateTransactionStatus(orderId, newStatus) {
  const entry = store.get(orderId);
  if (entry) {
    entry.data.status = newStatus;
    store.set(orderId, entry);
  }
}

module.exports = {
  saveTempTransaction,
  getTempTransaction,
  deleteTempTransaction,
  updateTransactionStatus
};

