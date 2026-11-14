import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { renderPost, TEMPLATES } from './render.js';
import { publishToInstagram } from './instagram.js';
import * as db from './db.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static('public'));

const BANNED = ['kata_kasar1', 'kata_kasar2'];

// ---------- Turnstile ----------
async function humanOk(token) {
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET, response: token }),
    });
    return (await r.json()).success === true;
  } catch {
    return false;
  }
}

// ---------- Auth admin (Basic Auth, username bebas, password = ADMIN_PASSWORD) ----------
const sha = (s) => crypto.createHash('sha256').update(s).digest();
function auth(req, res, next) {
  const [type, b64] = (req.headers.authorization || '').split(' ');
  const pass = type === 'Basic' ? Buffer.from(b64 || '', 'base64').toString().split(':').slice(1).join(':') : '';
  const secret = process.env.ADMIN_PASSWORD;
  if (secret && crypto.timingSafeEqual(sha(pass), sha(secret))) return next();
  res.set('WWW-Authenticate', 'Basic realm="Admin Menfess"').status(401).send('Login diperlukan');
}

// ---------- Kirim menfess (publik) ----------
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 3 });

app.post('/api/menfess', limiter, async (req, res) => {
  const { text, template, token } = req.body;

  if (!(await humanOk(token))) return res.status(400).json({ error: 'Verifikasi gagal. Muat ulang halaman lalu coba lagi.' });
  if (typeof text !== 'string' || !text.trim() || text.length > 280) {
    return res.status(400).json({ error: 'Teks kosong atau lebih dari 280 karakter' });
  }
  if (!TEMPLATES[template]) return res.status(400).json({ error: 'Template tidak dikenal' });
  if (BANNED.some((w) => text.toLowerCase().includes(w))) {
    return res.status(400).json({ error: 'Mengandung kata terlarang' });
  }

  db.add(text.trim(), template); // masuk antrean, menunggu admin
  res.json({ ok: true });
});

// ---------- Admin ----------
app.get('/admin', auth, (req, res) => res.sendFile('admin.html', { root: 'private' }));

app.get('/api/admin/list', auth, (req, res) => {
  res.json(db.list(String(req.query.status || 'pending')));
});

app.post('/api/admin/:id/approve', auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!db.claim(id)) return res.status(409).json({ error: 'Sudah diproses' });
  const item = db.get(id);
  try {
    const file = await renderPost(item.text, item.template);
    await publishToInstagram(`${process.env.BASE_URL}/images/${file}`, '#menfess');
    db.setStatus(id, 'posted');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    db.setStatus(id, 'failed', String(e.message).slice(0, 300));
    res.status(500).json({ error: 'Gagal memposting: ' + e.message });
  }
});

app.post('/api/admin/:id/reject', auth, (req, res) => {
  db.setStatus(Number(req.params.id), 'rejected');
  res.json({ ok: true });
});

app.listen(process.env.PORT || 3000, () => console.log('Jalan di port ' + (process.env.PORT || 3000)));