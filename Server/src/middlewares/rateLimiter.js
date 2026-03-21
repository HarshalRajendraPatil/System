const { rateLimit } = require('express-rate-limit');

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests. Please retry after a short delay.',
  },
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many auth requests. Please wait and retry.',
  },
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts. Please retry in a few minutes.',
  },
});

const writeRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Write rate limit reached. Please slow down and retry.',
  },
});

const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'AI request limit reached. Please retry shortly.',
  },
});

module.exports = {
  aiRateLimiter,
  apiRateLimiter,
  authRateLimiter,
  loginRateLimiter,
  writeRateLimiter,
};
