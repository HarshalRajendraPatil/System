const express = require('express');
const {
  deleteProblem,
  getAnalytics,
  getLeetCodeSyncSettings,
  getProblemsList,
  getProblemStats,
  postLeetCodeSync,
  postDSAProblem,
  putLeetCodeSyncSettings,
  putDSAProblem,
} = require('../controllers/dsaController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const dsaRoutes = express.Router();

dsaRoutes.post('/problems', writeRateLimiter, postDSAProblem);
dsaRoutes.get('/problems', getProblemsList);
dsaRoutes.get('/stats', getProblemStats);
dsaRoutes.get('/analytics', getAnalytics);
dsaRoutes.get('/leetcode/settings', getLeetCodeSyncSettings);
dsaRoutes.put('/leetcode/settings', writeRateLimiter, putLeetCodeSyncSettings);
dsaRoutes.post('/leetcode/sync', writeRateLimiter, postLeetCodeSync);
dsaRoutes.put('/problems/:id', writeRateLimiter, putDSAProblem);
dsaRoutes.delete('/problems/:id', writeRateLimiter, deleteProblem);

module.exports = dsaRoutes;
