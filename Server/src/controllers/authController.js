const { AUTH_COOKIE } = require('../constants/auth');
const {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
} = require('../services/authService');
const { clearAuthCookies, setAuthCookies } = require('../utils/authCookies');
const { verifyRefreshToken } = require('../utils/authTokens');

const postRegister = async (req, res, next) => {
  try {
    const result = await registerUser(req.body || {});
    setAuthCookies(res, result.tokens);

    return res.status(201).json({
      success: true,
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const postLogin = async (req, res, next) => {
  try {
    const result = await loginUser(req.body || {});
    setAuthCookies(res, result.tokens);

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const postRefresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[AUTH_COOKIE.REFRESH_TOKEN] || '';
    const result = await refreshSession(refreshToken);
    setAuthCookies(res, result.tokens);

    return res.status(200).json({
      success: true,
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    clearAuthCookies(res);
    return next(error);
  }
};

const postLogout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[AUTH_COOKIE.REFRESH_TOKEN] || '';

    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        await logoutUser(decoded.sub);
      } catch {
        // Ignore token errors on logout and always clear cookies.
      }
    }

    clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      data: {
        loggedOut: true,
      },
    });
  } catch (error) {
    clearAuthCookies(res);
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.userId);

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMe,
  postLogin,
  postLogout,
  postRefresh,
  postRegister,
};
