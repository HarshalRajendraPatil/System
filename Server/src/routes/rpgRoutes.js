const express = require('express');
const {
  getAchievements,
  getDashboard,
  getDailyQuestHistory,
  updateDailyQuest,
} = require('../controllers/rpgController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const rpgRoutes = express.Router();

rpgRoutes.get('/dashboard', getDashboard);
rpgRoutes.get('/achievements', getAchievements);
rpgRoutes.put('/daily-quest', writeRateLimiter, updateDailyQuest);
rpgRoutes.get('/daily-quest/history', getDailyQuestHistory);

module.exports = rpgRoutes;
