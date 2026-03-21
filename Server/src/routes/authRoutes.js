const express = require('express');
const {
  getMe,
  postLogin,
  postLogout,
  postRefresh,
  postRegister,
} = require('../controllers/authController');
const { authenticateRequest } = require('../middlewares/auth');
const { authRateLimiter, loginRateLimiter } = require('../middlewares/rateLimiter');

const authRoutes = express.Router();

authRoutes.post('/register', authRateLimiter, postRegister);
authRoutes.post('/login', loginRateLimiter, postLogin);
authRoutes.post('/refresh', authRateLimiter, postRefresh);
authRoutes.post('/logout', authRateLimiter, postLogout);
authRoutes.get('/me', authenticateRequest, getMe);

module.exports = authRoutes;
