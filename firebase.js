const admin = require('firebase-admin');
require('dotenv').config(); // Asegúrate de que dotenv esté configurado

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const messaging = admin.messaging(); // ✅ FCM enabled

module.exports = { db, messaging };

