const fs = require('fs');
const path = require('path');
const { sendEmailViaSendPulse } = require('./sendpulseService');

async function sendEmail({ recipients, templateType, context, subject }) {
  const htmlPath = path.join(__dirname, `../templates/${templateType}.html`);
  let html = fs.readFileSync(htmlPath, 'utf-8');

  for (const key in context) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), context[key]);
  }

  try {
    for (const email of Array.isArray(recipients) ? recipients : [recipients]) {
      await sendEmailViaSendPulse({
        to: email,
        subject,
        html
      });
    }

    console.log(`📧 Email enviado a:`, recipients);
  } catch (err) {
    console.error('❌ Error enviando con SendPulse:', err);
  }
}

module.exports = {
  sendEmail
};

