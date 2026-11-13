import crypto from 'node:crypto';

export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const LIMITS = {
  MAX_MENUS_PER_USER: 20,
  MAX_HISTORY_PER_USER: 50,
  MAX_SHARED_MENUS: 2000,
  SHARED_MENU_TTL_MS: 30 * 24 * 60 * 60 * 1000,
  MAX_TOTAL_USERS: 5000,
  STALE_USER_DAYS: 90,
  PIN_USER_MAX_FAILS: 5,
  PIN_IP_MAX_FAILS: 15,
  PIN_LOCK_WINDOW_MS: 10 * 60 * 1000,
  REG_IP_MAX_PER_HOUR: 5,
  REG_IP_WINDOW_MS: 60 * 60 * 1000,
};

export function validatePin(rawPin) {
  if (typeof rawPin !== 'string' || !/^\d{4}$/.test(rawPin)) {
    throw new ValidationError('请输入 4 位数字 PIN 码', 400);
  }
  return rawPin;
}

export function hashPin(rawPin) {
  const pin = validatePin(rawPin);
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pin, salt, 32).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPin(rawPin, storedHash) {
  if (typeof rawPin !== 'string' || !/^\d{4}$/.test(rawPin) || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [algo, salt, hex] = parts;
  if (algo !== 'scrypt' || !salt || !hex) return false;

  try {
    const derived = crypto.scryptSync(rawPin, salt, 32);
    const expected = Buffer.from(hex, 'hex');
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export function getPinVersion(pinHash) {
  return pinHash
    ? crypto.createHash('sha256').update(pinHash).digest('hex').slice(0, 12)
    : 'nopin';
}

export function resolveSigningKey(env = process.env) {
  const seed =
    env.AUTH_SECRET ||
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    env.PRISMA_DATABASE_URL ||
    'local-sqlite-dev-secret';
  return crypto.createHash('sha256').update(`wte-token-v1:${seed}`).digest();
}

export function signAuthToken({ username, pinHash }, secretKey, ttlSeconds = 30 * 24 * 3600) {
  const payload = {
    u: String(username || '').trim().toLowerCase(),
    pv: getPinVersion(pinHash),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const p64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secretKey).update(p64).digest('base64url');
  return `${p64}.${sig}`;
}

export function verifyAuthToken(token, expectedUsername, currentPinHash, secretKey) {
  if (typeof token !== 'string' || !token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [p64, sig] = parts;
  if (!p64 || !sig) return false;

  const expectedSig = crypto.createHmac('sha256', secretKey).update(p64).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(p64, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object') return false;
    if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) {
      return false;
    }
    const cleanExpected = String(expectedUsername || '').trim().toLowerCase();
    if (!cleanExpected || payload.u !== cleanExpected) {
      return false;
    }
    if (payload.pv !== getPinVersion(currentPinHash)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function extractClientIp(req) {
  const raw =
    req?.headers?.['x-vercel-forwarded-for'] ||
    req?.headers?.['x-forwarded-for'] ||
    req?.headers?.['x-real-ip'] ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    '127.0.0.1';
  const first = String(raw).split(',')[0].trim();
  return (first || '127.0.0.1').slice(0, 64);
}

export function verifyAntiBotRequest(req, { checkHoneypot = false } = {}) {
  if (checkHoneypot && typeof req?.body?.website === 'string' && req.body.website.trim() !== '') {
    throw new ValidationError('请求异常，请刷新页面重试', 403);
  }
  if (req?.headers?.['x-wte-client'] !== 'web-v1') {
    throw new ValidationError('非法客户端请求，请刷新页面后重试', 403);
  }

  const origin = req?.headers?.origin;
  if (origin) {
    let originHost;
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      throw new ValidationError('跨域请求被拒绝', 403);
    }
    if (!originHost) {
      throw new ValidationError('跨域请求被拒绝', 403);
    }
    const allowedHosts = [req.headers['x-forwarded-host'], req.headers.host]
      .filter(Boolean)
      .flatMap((val) => String(val).split(','))
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    if (allowedHosts.length > 0 && !allowedHosts.includes(originHost)) {
      throw new ValidationError('跨域请求被拒绝', 403);
    }
  }
}
