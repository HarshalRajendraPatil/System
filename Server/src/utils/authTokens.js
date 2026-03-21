const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const signToken = (payload, secret, ttlMs) => {
  const expiresInSeconds = Math.floor(ttlMs / 1000);

  return jwt.sign(payload, secret, {
    expiresIn: `${expiresInSeconds}s`,
  });
};

const createAccessToken = (payload) => signToken(payload, env.jwtAccessSecret, env.jwtAccessTtlMs);
const createRefreshToken = (payload) => signToken(payload, env.jwtRefreshSecret, env.jwtRefreshTtlMs);

const verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
