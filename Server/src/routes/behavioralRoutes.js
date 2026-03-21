const express = require('express');
const {
  getAnalyticsOverview,
  getRandomPractice,
  getStory,
  getStoryList,
  postPracticeSession,
  postStory,
  putStory,
  removeStory,
} = require('../controllers/behavioralController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const behavioralRoutes = express.Router();

behavioralRoutes.get('/stories', getStoryList);
behavioralRoutes.get('/stories/:id', getStory);
behavioralRoutes.post('/stories', writeRateLimiter, postStory);
behavioralRoutes.put('/stories/:id', writeRateLimiter, putStory);
behavioralRoutes.delete('/stories/:id', writeRateLimiter, removeStory);
behavioralRoutes.post('/stories/:id/practice', writeRateLimiter, postPracticeSession);
behavioralRoutes.get('/practice/random', getRandomPractice);
behavioralRoutes.get('/analytics/overview', getAnalyticsOverview);

module.exports = behavioralRoutes;
