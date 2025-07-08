const sendpulse = require('sendpulse-api');

const SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID;
const SENDPULSE_SECRET = process.env.SENDPULSE_SECRET;
const TOKEN_STORAGE = '/tmp/'; // válido para Vercel (fs temporal)

sendpulse.init(SENDPULSE_USER_ID, SENDPULSE_SECRET, TOKEN_STORAGE, () => {
  console.log('✅ SendPulse API inicializada');
});

async function sendEmailViaSendPulse({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const emailData = {
      html,
      text: '',
      subject,
      from: {
        name: 'EspaciosYa',
        email: 'noreply@espaciosya.app'
      },
      to: [
        {
          email: to,
          name: ''
        }
      ]
    };

    sendpulse.smtpSendMail(
      (response) => {
        console.log('📨 SendPulse enviado:', response);
        if (response.result) {
          resolve(true);
        } else {
          reject(new Error(response.message || 'Error al enviar correo'));
        }
      },
      emailData
    );
  });
}

module.exports = {
  sendEmailViaSendPulse
};

