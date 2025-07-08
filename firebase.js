const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json'); // 🔐

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const messaging = admin.messaging(); // ✅ FCM enabled

module.exports = { db, messaging };

