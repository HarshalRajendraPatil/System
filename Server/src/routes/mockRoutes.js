const express = require('express');
const {
  getMockCalendar,
  getMockLogList,
  getMockTrends,
  postMockLog,
  putMockLog,
  removeMockLog,
} = require('../controllers/mockController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const mockRoutes = express.Router();

mockRoutes.get('/logs', getMockLogList);
mockRoutes.post('/logs', writeRateLimiter, postMockLog);
mockRoutes.put('/logs/:id', writeRateLimiter, putMockLog);
mockRoutes.delete('/logs/:id', writeRateLimiter, removeMockLog);
mockRoutes.get('/calendar', getMockCalendar);
mockRoutes.get('/trends', getMockTrends);

module.exports = mockRoutes;
