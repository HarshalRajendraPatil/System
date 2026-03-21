const { env } = require('../config/env');
const { AUTH_COOKIE } = require('../constants/auth');

const baseCookieOptions = () => {
  const options = {
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: env.cookieSameSite,
    path: '/',
  };

  if (env.cookieDomain) {
    options.domain = env.cookieDomain;
  }

  return options;
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const options = baseCookieOptions();

  res.cookie(AUTH_COOKIE.ACCESS_TOKEN, accessToken, {
    ...options,
    maxAge: env.jwtAccessTtlMs,
  });

  res.cookie(AUTH_COOKIE.REFRESH_TOKEN, refreshToken, {
    ...options,
    maxAge: env.jwtRefreshTtlMs,
  });
};

const clearAuthCookies = (res) => {
  const options = baseCookieOptions();
  res.clearCookie(AUTH_COOKIE.ACCESS_TOKEN, options);
  res.clearCookie(AUTH_COOKIE.REFRESH_TOKEN, options);
};

module.exports = {
  clearAuthCookies,
  setAuthCookies,
};
