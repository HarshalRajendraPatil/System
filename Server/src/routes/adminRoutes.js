const express = require('express');
const {
  deleteUser,
  getOverview,
  getRecentActivity,
  getUsers,
  patchUser,
} = require('../controllers/adminController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const adminRoutes = express.Router();

adminRoutes.get('/overview', getOverview);
adminRoutes.get('/users', getUsers);
adminRoutes.patch('/users/:id', writeRateLimiter, patchUser);
adminRoutes.delete('/users/:id', writeRateLimiter, deleteUser);
adminRoutes.get('/activity/recent', getRecentActivity);

module.exports = adminRoutes;
