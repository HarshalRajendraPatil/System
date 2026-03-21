const express = require('express');
const {
  getInsightHistory,
  getLatestInsight,
  getSnapshot,
  postCoachReport,
  postMotivation,
} = require('../controllers/aiCoachController');
const { aiRateLimiter, writeRateLimiter } = require('../middlewares/rateLimiter');

const aiRoutes = express.Router();

aiRoutes.get('/history', aiRateLimiter, getInsightHistory);
aiRoutes.get('/latest', aiRateLimiter, getLatestInsight);
aiRoutes.get('/snapshot', aiRateLimiter, getSnapshot);
aiRoutes.post('/coach/report', aiRateLimiter, writeRateLimiter, postCoachReport);
aiRoutes.post('/coach/motivation', aiRateLimiter, writeRateLimiter, postMotivation);

module.exports = aiRoutes;
