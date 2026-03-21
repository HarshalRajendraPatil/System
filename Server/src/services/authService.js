const bcrypt = require('bcryptjs');
const UserProfile = require('../models/UserProfile');
const { createHttpError } = require('../utils/httpError');
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} = require('../utils/authTokens');
const { env } = require('../config/env');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeUsername = (username) => String(username || '').trim().toLowerCase();

const validatePassword = (password) => {
  const value = String(password || '');

  if (value.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);

  if (!hasLower || !hasUpper || !hasDigit) {
    return 'Password must include uppercase, lowercase, and a number';
  }

  return '';
};

const sanitizeUser = (user) => ({
  id: String(user._id),
  username: user.username,
  displayName: user.displayName,
  email: user.email || '',
  role: user.role,
  isActive: user.isActive,
  totalXp: user.totalXp,
  level: user.level,
});

const createTokensForUser = async (user) => {
  const payload = {
    sub: String(user._id),
    role: user.role,
    username: user.username,
  };

  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

  user.refreshTokenHash = refreshTokenHash;
  user.refreshTokenExpiresAt = new Date(Date.now() + env.jwtRefreshTtlMs);
  user.lastLoginAt = new Date();
  await user.save();

  return {
    accessToken,
    refreshToken,
  };
};

const registerUser = async (payload = {}) => {
  const username = normalizeUsername(payload.username);
  const email = normalizeEmail(payload.email);
  const displayName = String(payload.displayName || '').trim();
  const password = String(payload.password || '');

  if (!USERNAME_PATTERN.test(username)) {
    throw createHttpError(400, 'Username must be 3-24 chars and use only letters, numbers, and underscores');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError(400, 'Please enter a valid email address');
  }

  if (!displayName || displayName.length < 2) {
    throw createHttpError(400, 'Display name must be at least 2 characters long');
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    throw createHttpError(400, passwordError);
  }

  const [existingByUsername, existingByEmail] = await Promise.all([
    UserProfile.findOne({ username }).lean(),
    UserProfile.findOne({ email }).lean(),
  ]);

  if (existingByUsername) {
    throw createHttpError(409, 'Username is already taken');
  }

  if (existingByEmail) {
    throw createHttpError(409, 'Email is already registered');
  }

  const user = new UserProfile({
    username,
    email,
    displayName,
  });

  await user.setPassword(password);
  await user.save();

  const tokens = await createTokensForUser(user);

  return {
    user: sanitizeUser(user),
    tokens,
  };
};

const loginUser = async (payload = {}) => {
  const identifier = String(payload.identifier || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (!identifier || !password) {
    throw createHttpError(400, 'Identifier and password are required');
  }

  const user = await UserProfile.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select('+passwordHash +refreshTokenHash +refreshTokenExpiresAt');

  if (!user || !(await user.comparePassword(password))) {
    throw createHttpError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw createHttpError(403, 'Your account is inactive. Contact support.');
  }

  const tokens = await createTokensForUser(user);

  return {
    user: sanitizeUser(user),
    tokens,
  };
};

const getCurrentUser = async (userId) => {
  const user = await UserProfile.findById(userId).lean();

  if (!user || !user.isActive) {
    throw createHttpError(401, 'Session is invalid. Please log in again.');
  }

  return sanitizeUser(user);
};

const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    throw createHttpError(401, 'Refresh token is missing');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw createHttpError(401, 'Refresh token is invalid or expired');
  }

  const user = await UserProfile.findById(decoded.sub)
    .select('+refreshTokenHash +refreshTokenExpiresAt');

  if (!user || !user.isActive) {
    throw createHttpError(401, 'Session is invalid. Please log in again.');
  }

  if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    throw createHttpError(401, 'Session has been revoked. Please log in again.');
  }

  if (user.refreshTokenExpiresAt.getTime() < Date.now()) {
    throw createHttpError(401, 'Session expired. Please log in again.');
  }

  const isTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!isTokenValid) {
    throw createHttpError(401, 'Session has been revoked. Please log in again.');
  }

  const tokens = await createTokensForUser(user);

  return {
    user: sanitizeUser(user),
    tokens,
  };
};

const logoutUser = async (userId) => {
  if (!userId) {
    return;
  }

  await UserProfile.findByIdAndUpdate(userId, {
    $set: {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
  });
};

module.exports = {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
};
