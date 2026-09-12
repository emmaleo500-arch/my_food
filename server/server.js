// BBN'S Local Food — backend
// Serves the website and emails every order placed on it to the kitchen inbox.

require('dotenv').config();
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const TO_EMAIL = process.env.TO_EMAIL || 'nkrumahvida61@gmail.com';

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mail transporter — uses Gmail SMTP with an App Password by default.
// Any SMTP provider works: set SMTP_HOST/SMTP_PORT instead if you're not using Gmail.
const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      }
    : {
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      }
);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

app.post('/api/order', async (req, res) => {
  const { orderDay, protein, quantity, fulfilment, address, fullName, phone, notes } = req.body || {};

  // Basic validation — the fields that matter for the kitchen to act on the order.
  if (!orderDay || !fullName || !phone || !fulfilment) {
    return res.status(400).json({ error: 'Missing required order details.' });
  }
  if (fulfilment === 'Delivery' && !address) {
    return res.status(400).json({ error: 'A delivery address is required for delivery orders.' });
  }

  const rows = [
    ['Day / dish', orderDay],
    ['Quantity', quantity || '1'],
    ['Preference', protein || '—'],
    ['Fulfilment', fulfilment],
  ];
  if (fulfilment === 'Delivery') rows.push(['Delivery address', address || '—']);
  rows.push(['Name', fullName]);
  rows.push(['Phone', phone]);
  if (notes) rows.push(['Notes', notes]);

  const textBody = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const htmlBody = `
    <h2 style="font-family:sans-serif;color:#053B18;">New order — BBN'S Local Food</h2>
    <table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;">
      ${rows
        .map(
          ([label, value]) => `
        <tr>
          <td style="border:1px solid #E4DEC8;font-weight:600;background:#FFFCF3;">${escapeHtml(label)}</td>
          <td style="border:1px solid #E4DEC8;">${escapeHtml(value)}</td>
        </tr>`
        )
        .join('')}
    </table>
  `;

  try {
    await transporter.sendMail({
      from: `"BBN'S Local Food website" <${process.env.EMAIL_USER}>`,
      to: TO_EMAIL,
      replyTo: undefined,
      subject: `New order — ${fullName} (${orderDay.split(' — ')[0] || orderDay})`,
      text: textBody,
      html: htmlBody
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send order email:', err.message);
    return res.status(502).json({ error: 'Could not send the order email. Please try again or message us on WhatsApp.' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`BBN'S Local Food server running at http://localhost:${PORT}`);
});
