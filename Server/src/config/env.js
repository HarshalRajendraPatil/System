const dotenv = require('dotenv');

dotenv.config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/grindforge',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'replace-me-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'replace-me-refresh-secret',
  jwtAccessTtlMs: toNumber(process.env.JWT_ACCESS_TTL_MS, 15 * 60 * 1000),
  jwtRefreshTtlMs: toNumber(process.env.JWT_REFRESH_TTL_MS, 7 * 24 * 60 * 60 * 1000),
  secureCookies: toBoolean(process.env.SECURE_COOKIES, process.env.NODE_ENV === 'production'),
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  grokApiKey: process.env.GROK_API_KEY || '',
  grokBaseUrl: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
  grokModel: process.env.GROK_MODEL || 'grok-2-latest',
  grokTimeoutMs: toNumber(process.env.GROK_TIMEOUT_MS, 20000),
  aiCoachFallbackOnly: toBoolean(process.env.AI_COACH_FALLBACK_ONLY, false),
  realtimeEnabled: toBoolean(process.env.REALTIME_ENABLED, true),
  socketPath: process.env.SOCKET_PATH || '/socket.io',
  realtimeRedisUrl: process.env.REALTIME_REDIS_URL || '',
};

module.exports = { env };
