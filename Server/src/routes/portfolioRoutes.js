const express = require('express');
const { authenticateRequest } = require('../middlewares/auth');
const {
  getMyPortfolio,
  getPortfolioExport,
  getPublicPortfolio,
  patchMyPortfolioSettings,
} = require('../controllers/portfolioController');
const { publicReadRateLimiter, writeRateLimiter } = require('../middlewares/rateLimiter');

const portfolioRoutes = express.Router();

portfolioRoutes.get('/public/:slug', publicReadRateLimiter, getPublicPortfolio);

portfolioRoutes.use(authenticateRequest);

portfolioRoutes.get('/me', getMyPortfolio);
portfolioRoutes.get('/export', getPortfolioExport);
portfolioRoutes.patch('/settings', writeRateLimiter, patchMyPortfolioSettings);

module.exports = portfolioRoutes;