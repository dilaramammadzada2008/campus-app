// Campus Life API: passwordless sign-up / sign-in with e-mail codes sent through Gmail or Resend.
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'room-requests.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
// In dev the API always sits on 3001 behind the Vite proxy; in production it uses the host's PORT.
const PORT = process.argv.includes('--dev') ? 3001 : Number(process.env.PORT) || 3001;

const RESEND_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'Campus Life <onboarding@resend.dev>';
const DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || 'stud.vilniustech.lt,vilniustech.lt')
  .split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
const ADMINS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const isAdmin = (email) => ADMINS.includes(email);

// ---------- e-mail ----------
// Gmail (an App Password) sends to anyone without a domain, so it wins when set; then Resend; otherwise dev mode.
const GMAIL_USER = (process.env.GMAIL_USER || '').trim();
const GMAIL_PASS = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
const gmail = GMAIL_USER && GMAIL_PASS
  ? nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_PASS } })
  : null;
const resend = !gmail && RESEND_KEY ? new Resend(RESEND_KEY) : null;
const DEV_MODE = !gmail && !resend;
const MAIL_DESC = gmail ? `Gmail, from ${GMAIL_USER}` : resend ? `Resend, from ${RESEND_FROM}` : 'DEV MODE (no mail provider: codes are shown on screen)';

async function sendMail({ to, subject, text, html }) {
  if (gmail) { await gmail.sendMail({ from: `Campus Life <${GMAIL_USER}>`, to, subject, text, html }); return; }
  const { error } = await resend.emails.send({ from: RESEND_FROM, to: [to], subject, text, html });
  if (error) throw new Error(error.message || JSON.stringify(error));
}

const CODE_TTL_MIN = 10;
const RESEND_WAIT_S = 30;
const MAX_ATTEMPTS = 5;

// ---------- storage ----------
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const load = (file, empty = {}) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return empty; } };
const save = (file, obj) => fs.writeFileSync(file, JSON.stringify(obj, null, 2));
const users = load(USERS_FILE);       // email -> { profile, created }
const sessions = load(SESSIONS_FILE); // token -> email
const requests = load(REQUESTS_FILE, []); // room registration requests, newest last
const codes = new Map();              // email -> { hash, expires, sent, attempts }

const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && DOMAINS.some((d) => e.endsWith('@' + d));
const authEmail = (req) => {
  const h = req.get('authorization') || '';
  return h.startsWith('Bearer ') ? sessions[h.slice(7)] : undefined;
};

async function sendCodeMail(to, code, mode) {
  const action = mode === 'signup' ? 'finish creating your account' : 'sign in';
  await sendMail({
    to,
    subject: `Your Campus Life code: ${code}`,
    text: `Your Campus Life code is ${code}. It expires in ${CODE_TTL_MIN} minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px">
      <h2 style="margin:0 0 12px">Campus Life</h2>
      <p>Use this code to ${action}:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
      <p style="color:#666;font-size:13px">The code expires in ${CODE_TTL_MIN} minutes. If you didn't request it, you can ignore this e-mail.</p>
    </div>`,
  });
}

// ---------- api ----------
const app = express();
app.use(express.json({ limit: '22mb' })); // room requests carry the signed form (up to 15 MB) as base64

app.get('/api/config', (req, res) => res.json({ domains: DOMAINS, devMode: DEV_MODE }));

app.post('/api/send-code', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { mode } = req.body;
  if (mode !== 'signup' && mode !== 'signin') return res.status(400).json({ error: 'Unknown mode.' });
  if (!validEmail(email)) return res.status(400).json({ error: 'Use your VILNIUS TECH e-mail address.' });
  const exists = Boolean(users[email]);
  if (mode === 'signup' && exists) return res.status(409).json({ error: 'An account with this e-mail already exists. Sign in instead.', code: 'exists' });
  if (mode === 'signin' && !exists) return res.status(404).json({ error: 'No account found for this e-mail. Sign up first.', code: 'missing' });

  const prev = codes.get(email);
  const since = prev ? (Date.now() - prev.sent) / 1000 : Infinity;
  if (since < RESEND_WAIT_S) {
    const wait = Math.ceil(RESEND_WAIT_S - since);
    return res.status(429).json({ error: `Wait ${wait} s before requesting a new code.`, wait });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  if (!DEV_MODE) {
    try { await sendCodeMail(email, code, mode); }
    catch (e) {
      console.error('E-mail error:', e.message);
      return res.status(502).json({ error: "Couldn't send the e-mail. Try again in a minute." });
    }
  }
  codes.set(email, { hash: hash(`${email}|${code}`), expires: Date.now() + CODE_TTL_MIN * 60_000, sent: Date.now(), attempts: 0 });
  if (DEV_MODE) console.log(`DEV code for ${email}: ${code}`);
  res.json({ ok: true, wait: RESEND_WAIT_S, ...(DEV_MODE && { devCode: code }) });
});

app.post('/api/verify-code', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  const c = codes.get(email);
  if (!c || Date.now() > c.expires) return res.status(400).json({ error: 'This code has expired. Request a new one.', code: 'expired' });
  if (c.attempts >= MAX_ATTEMPTS) return res.status(429).json({ error: 'Too many wrong attempts. Request a new code.', code: 'expired' });
  if (hash(`${email}|${code}`) !== c.hash) {
    c.attempts++;
    return res.status(400).json({ error: 'Wrong code. Check it and try again, or request a new one.' });
  }
  codes.delete(email);
  const token = crypto.randomBytes(32).toString('base64url');
  sessions[token] = email;
  save(SESSIONS_FILE, sessions);
  res.json({ ok: true, token, profile: users[email]?.profile ?? null, isAdmin: isAdmin(email) });
});

app.post('/api/profile', (req, res) => {
  const email = authEmail(req);
  if (!email) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  const p = req.body.profile || {};
  if (!p.name || !['F', 'M'].includes(p.g)) return res.status(400).json({ error: 'Name and gender are required.' });
  users[email] = { profile: p, created: users[email]?.created || new Date().toISOString() };
  save(USERS_FILE, users);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const email = authEmail(req);
  if (!email || !users[email]) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ email, profile: users[email].profile, isAdmin: isAdmin(email) });
});

// ---------- room registration requests ----------
// A student sends one request (bed + signed form). It stays "pending" until an admin approves or rejects it.
const ACTIVE = ['pending', 'approved'];
const publicReq = ({ file, ...r }) => ({ ...r, hasFile: Boolean(file) });
const requireUser = (req, res, next) => {
  const email = authEmail(req);
  if (!email || !users[email]) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  req.email = email; next();
};
const requireAdmin = (req, res, next) => requireUser(req, res, () => (isAdmin(req.email) ? next() : res.status(403).json({ error: 'Admins only.' })));

async function notify(to, subject, text) {
  if (DEV_MODE) return console.log(`DEV e-mail to ${to}: ${subject}`);
  try { await sendMail({ to, subject, text }); } catch (e) { console.error('E-mail error:', e.message); }
}

app.post('/api/room-requests', requireUser, (req, res) => {
  const b = req.body || {};
  const building = Number(b.building), bed = Number(b.bed), room = String(b.room || '');
  if (![1, 2, 3].includes(building) || !/^[AB]-\d{3,4}$/.test(room) || !(bed >= 1 && bed <= 3)) return res.status(400).json({ error: 'Invalid room.' });
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(b.fileData || '');
  if (!m || !(/^image\//.test(m[1]) || m[1] === 'application/pdf')) return res.status(400).json({ error: 'Upload the signed form as an image or PDF.' });
  if (requests.some((r) => r.email === req.email && ACTIVE.includes(r.status))) return res.status(409).json({ error: 'You already have a room request. Wait for the administrator.' });
  if (requests.some((r) => r.building === building && r.room === room && r.bed === bed && ACTIVE.includes(r.status))) return res.status(409).json({ error: 'Someone else has already requested this bed. Pick another one.' });

  const id = crypto.randomBytes(8).toString('hex');
  const ext = m[1] === 'application/pdf' ? '.pdf' : '.' + (m[1].split('/')[1] || 'img').replace(/[^a-z0-9]/gi, '');
  fs.writeFileSync(path.join(UPLOADS_DIR, id + ext), Buffer.from(m[2], 'base64'));
  const p = users[req.email].profile;
  const r = {
    id, email: req.email, name: p.name, c: p.c, g: p.g,
    building, block: room[0], floor: Number(b.floor) || null, room, bed, appNo: String(b.appNo || '').slice(0, 40),
    fileName: String(b.fileName || 'form').slice(0, 120), fileType: m[1], file: id + ext,
    status: 'pending', note: '', createdAt: new Date().toISOString(),
  };
  requests.push(r); save(REQUESTS_FILE, requests);
  res.json(publicReq(r));
});

app.get('/api/room-requests/mine', requireUser, (req, res) => {
  res.json(requests.filter((r) => r.email === req.email).reverse().map(publicReq));
});

// Beds held by other students (pending or approved), so everyone sees them as taken.
app.get('/api/room-requests/occupancy', requireUser, (req, res) => {
  res.json(requests.filter((r) => r.email !== req.email && ACTIVE.includes(r.status))
    .map(({ id, building, room, bed, name, c, g, status }) => ({ id, building, room, bed, name, c, g, status })));
});

app.post('/api/room-requests/:id/cancel', requireUser, (req, res) => {
  const r = requests.find((x) => x.id === req.params.id && x.email === req.email);
  if (!r || r.status !== 'pending') return res.status(400).json({ error: 'Only a pending request can be cancelled.' });
  r.status = 'cancelled'; r.decidedAt = new Date().toISOString(); save(REQUESTS_FILE, requests);
  res.json(publicReq(r));
});

app.get('/api/room-requests/:id/file', requireUser, (req, res) => {
  const r = requests.find((x) => x.id === req.params.id);
  if (!r || (r.email !== req.email && !isAdmin(req.email))) return res.status(404).json({ error: 'Not found.' });
  res.type(r.fileType).sendFile(path.join(UPLOADS_DIR, r.file));
});

app.get('/api/admin/room-requests', requireAdmin, (req, res) => {
  res.json(requests.slice().reverse().map(publicReq));
});

app.post('/api/admin/room-requests/:id/decision', requireAdmin, (req, res) => {
  const r = requests.find((x) => x.id === req.params.id);
  const { decision } = req.body || {};
  const note = String(req.body?.note || '').trim().slice(0, 500);
  if (!r) return res.status(404).json({ error: 'Not found.' });
  if (r.status !== 'pending') return res.status(409).json({ error: 'This request has already been decided.' });
  if (decision !== 'approve' && decision !== 'reject') return res.status(400).json({ error: 'Unknown decision.' });
  if (decision === 'reject' && !note) return res.status(400).json({ error: 'Write a short reason for the student.' });
  r.status = decision === 'approve' ? 'approved' : 'rejected';
  r.note = note; r.decidedAt = new Date().toISOString(); r.decidedBy = req.email;
  save(REQUESTS_FILE, requests);
  notify(r.email,
    r.status === 'approved' ? `Your room ${r.room} is approved` : `Your room request for ${r.room} was rejected`,
    r.status === 'approved'
      ? `Hi ${r.name},\n\nThe administrator approved your registration: Building ${r.building}, room ${r.room}, bed ${r.bed}.${note ? '\n\nNote: ' + note : ''}\n\nPick up your key card at reception.\n\nCampus Life`
      : `Hi ${r.name},\n\nThe administrator rejected your request for Building ${r.building}, room ${r.room}.\n\nReason: ${note}\n\nYou can pick another bed in Campus Life.\n\nCampus Life`);
  res.json(publicReq(r));
});

app.post('/api/logout', (req, res) => {
  const h = req.get('authorization') || '';
  if (h.startsWith('Bearer ')) { delete sessions[h.slice(7)]; save(SESSIONS_FILE, sessions); }
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// In production (npm run build && npm start) the server also serves the React app.
const DIST = path.join(ROOT, 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Campus Life API on http://localhost:${PORT} | e-mail: ${MAIL_DESC} | domains: ${DOMAINS.join(', ')}`);
});
