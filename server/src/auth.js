// Вхід координатора: один пароль із .env (ADMIN_PASSWORD), без акаунтів і реєстрації.
// Після правильного пароля сервер видає підписаний токен (HMAC-SHA256) із терміном дії.
// Токен не зберігається в базі: сервер перевіряє лише підпис і термін.
import crypto from 'node:crypto';
import { Router } from 'express';
import { HttpError, asyncHandler } from './utils.js';

const TTL_MS = 8 * 60 * 60 * 1000; // токен діє 8 годин

function password() {
  return process.env.ADMIN_PASSWORD || '1234';
}
// Ключ підпису: окремий ADMIN_SECRET або похідний від пароля (токени стають недійсними при зміні пароля)
function secret() {
  return process.env.ADMIN_SECRET || crypto.createHash('sha256').update('helppulse:' + password()).digest('hex');
}
const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function issueToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresAt: Date.now() + TTL_MS };
}

export function verifyToken(token) {
  if (typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
  } catch {
    return false;
  }
}

export function requireAdmin(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ') && verifyToken(h.slice(7))) return next();
  next(new HttpError(401, 'Потрібен вхід координатора'));
}

// Обмеження підбору пароля: 5 помилок з однієї адреси за 10 хвилин -> блокування на 10 хвилин
const fails = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;

const router = Router();

// POST /api/auth/login   { password }
router.post('/login', asyncHandler(async (req, res) => {
  const ip = req.ip;
  const rec = fails.get(ip);
  if (rec && rec.count >= MAX_FAILS && Date.now() - rec.first < WINDOW_MS) {
    const mins = Math.ceil((WINDOW_MS - (Date.now() - rec.first)) / 60000);
    throw new HttpError(429, `Забагато невдалих спроб. Спробуйте через ${mins} хв.`);
  }
  const given = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!given) throw new HttpError(400, 'Введіть пароль');
  if (!safeEqual(given, password())) {
    const fresh = !rec || Date.now() - rec.first >= WINDOW_MS;
    fails.set(ip, fresh ? { count: 1, first: Date.now() } : { count: rec.count + 1, first: rec.first });
    throw new HttpError(401, 'Неправильний пароль');
  }
  fails.delete(ip);
  res.json(issueToken());
}));

// GET /api/auth/check   200, якщо токен дійсний (інакше 401 від захисту)
router.get('/check', (req, res) => res.json({ ok: true }));

export default router;

// Публічні маршрути (решта API доступна лише координатору).
// Додаються тільки ті, що потрібні відвідувачам: форми, відстеження, відгуки, лічильники.
const PUBLIC = [
  ['GET', /^\/health$/],
  ['POST', /^\/auth\/login$/],
  ['GET', /^\/items$/],
  ['GET', /^\/warehouses$/],
  ['POST', /^\/requests$/],
  ['POST', /^\/donations$/],
  ['GET', /^\/track\/(board|\d+)$/],
  ['POST', /^\/feedback$/],
  ['GET', /^\/feedback\/(public|summary)$/],
  ['GET', /^\/reports\/summary$/],
];

export function guard(req, res, next) {
  if (PUBLIC.some(([m, re]) => m === req.method && re.test(req.path))) return next();
  return requireAdmin(req, res, next);
}
