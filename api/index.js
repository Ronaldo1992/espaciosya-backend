// api/index.js
require('dotenv').config(); // ⬅️ Importante para leer .env

const express = require('express');
const cors = require('cors');

const transactionRoutes = require('../routes/transaction');
const ipnRoutes = require('../routes/ipn');
const checkTransactionRoutes = require('../routes/checkTransaction');
const testEmailRoute = require('../routes/testEmail');
const sendEmailApiRoute = require('../routes/sendEmail');
const changePasswordRoute = require('../routes/changePassword');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // ✅ más moderno que body-parser

// Rutas
app.use('/', transactionRoutes);
app.use('/', ipnRoutes);
app.use('/', checkTransactionRoutes);
app.use('/', testEmailRoute);
app.use('/', sendEmailApiRoute);
app.use('/', changePasswordRoute);

// ✅ Esto solo se ejecuta si corres el archivo directamente (local)
// Para Vercel, esto no se usa
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;





