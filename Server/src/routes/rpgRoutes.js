const express = require('express');
const {
  getAchievements,
  getDashboard,
  getDailyQuestHistory,
  getGlobalLeaderboard,
  getQuestDetail,
  getQuestXpOverview,
  updateDailyQuest,
} = require('../controllers/rpgController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const rpgRoutes = express.Router();

rpgRoutes.get('/dashboard', getDashboard);
rpgRoutes.get('/achievements', getAchievements);
rpgRoutes.get('/leaderboard/global', getGlobalLeaderboard);
rpgRoutes.get('/daily-quest/detail', getQuestDetail);
rpgRoutes.get('/daily-quest/xp-overview', getQuestXpOverview);
rpgRoutes.put('/daily-quest', writeRateLimiter, updateDailyQuest);
rpgRoutes.get('/daily-quest/history', getDailyQuestHistory);

module.exports = rpgRoutes;
