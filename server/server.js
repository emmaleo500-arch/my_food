// BBN'S Local Food — backend
// Serves the website and emails every order placed on it to the kitchen inbox.

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const TO_EMAIL = process.env.TO_EMAIL || 'nkrumahvida61@gmail.com';

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const DATA_DIR = path.join(__dirname, '..', 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const SEED_PRODUCTS = [
  { id: 'p_001', name: 'Fried Plantain', category: 'Chop', price: 15, unit: 'piece', desc: 'Sweet ripe plantain fried to golden perfection.', image: 'assets/food.jpg', available: true },
  { id: 'p_002', name: 'Kelewele', category: 'Chop', price: 15, unit: 'portion', desc: 'Spicy, peppery fried plantain cubes — our most-loved evening snack.', image: 'assets/food.jpg', available: true },
  { id: 'p_003', name: 'Boiled Yam with Pepper', category: 'Chop', price: 12, unit: 'plate', desc: 'Steamed yam served with fresh pepper.', image: 'assets/food.jpg', available: true },
  { id: 'p_004', name: 'Gari with Groundnut', category: 'Chop', price: 8, unit: 'cup', desc: 'Crispy gari tossed with roasted groundnuts.', image: 'assets/food.jpg', available: true },
  { id: 'p_005', name: 'Grilled Chicken Thighs', category: 'Dress', price: 25, unit: 'piece', desc: 'Marinated chicken thighs grilled over charcoal.', image: 'assets/food.jpg', available: true },
  { id: 'p_006', name: 'Fried Fish (Tilapia)', category: 'Dress', price: 30, unit: 'piece', desc: 'Whole tilapia fried to a crispy golden crust.', image: 'assets/food.jpg', available: true },
  { id: 'p_007', name: 'Stewed Fish', category: 'Dress', price: 28, unit: 'plate', desc: 'Fish slow-cooked in a rich tomato and pepper stew.', image: 'assets/food.jpg', available: true },
  { id: 'p_008', name: 'Chicken Sausage', category: 'Dress', price: 20, unit: 'piece', desc: 'Spiced chicken sausage, grilled or fried.', image: 'assets/food.jpg', available: true },
];

if (!fs.existsSync(PRODUCTS_FILE)) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(SEED_PRODUCTS, null, 2));
}

function readProducts() {
  try {
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

function saveProducts(list) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(list, null, 2));
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

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
      from: `"BBN'S Local Food " <${process.env.EMAIL_USER}>`,
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

app.get('/api/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password && password === process.env.SHOP_ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Wrong password.' });
});

app.post('/api/products', function (req, res, next) {
  upload.single('image')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, (req, res) => {
  const adminPassword = req.header('x-admin-password');
  if (adminPassword !== process.env.SHOP_ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const { name, category, price, unit, desc, available } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Name, category and price are required.' });
  }

  const products = readProducts();
  const product = {
    id: 'p_' + Date.now(),
    name: name.trim(),
    category: category.trim(),
    price: Number(price),
    unit: (unit || 'piece').trim(),
    desc: (desc || '').trim(),
    image: req.file ? '/uploads/' + req.file.filename : '',
    available: available !== 'false' && available !== false,
  };
  products.push(product);
  saveProducts(products);
  res.json({ ok: true, product });
});

app.post('/api/shop-order', async (req, res) => {
  const { items, fullName, phone, email, address, fulfilment, notes } = req.body || {};

  if (!items || !items.length || !fullName || !phone || !fulfilment) {
    return res.status(400).json({ error: 'Missing required order details.' });
  }
  if (fulfilment === 'Delivery' && !address) {
    return res.status(400).json({ error: 'A delivery address is required for delivery orders.' });
  }

  const total = items.reduce((sum, i) => sum + (Number(i.price) * Number(i.qty)), 0);

  const itemRows = items.map((i) => [`${i.name} (x${i.qty})`, `₵${(Number(i.price) * Number(i.qty)).toFixed(2)}`]);
  itemRows.push(['TOTAL', `₵${total.toFixed(2)}`]);

  const rows = [
    ['Customer', fullName],
    ['Phone', phone],
    ...(email ? [['Email', email]] : []),
    ['Fulfilment', fulfilment],
    ...(fulfilment === 'Delivery' ? [['Delivery address', address || '—']] : []),
    ...itemRows,
    ...(notes ? [['Notes', notes]] : []),
  ];

  const textBody = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const htmlBody = `
    <h2 style="font-family:sans-serif;color:#053B18;">New shop order — BBN'S Local Food</h2>
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
      from: `"BBN'S Local Food " <${process.env.EMAIL_USER}>`,
      to: TO_EMAIL,
      replyTo: email || undefined,
      subject: `New shop order — ${fullName} (₵${total.toFixed(2)})`,
      text: textBody,
      html: htmlBody
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send shop order email:', err.message);
    return res.status(502).json({ error: 'Could not send the order email. Please try again or message us on WhatsApp.' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`BBN'S Local Food server running at http://localhost:${PORT}`);
});
