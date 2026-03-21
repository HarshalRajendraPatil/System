const express = require('express');
const {
  getSimulationDetails,
  getSimulationHistoryList,
  postSimulationAnswer,
  postSimulationStart,
} = require('../controllers/interviewSimulatorController');
const { aiRateLimiter, writeRateLimiter } = require('../middlewares/rateLimiter');

const interviewSimulatorRoutes = express.Router();

interviewSimulatorRoutes.get('/history', aiRateLimiter, getSimulationHistoryList);
interviewSimulatorRoutes.get('/:id', aiRateLimiter, getSimulationDetails);
interviewSimulatorRoutes.post('/start', aiRateLimiter, writeRateLimiter, postSimulationStart);
interviewSimulatorRoutes.post('/:id/answer', aiRateLimiter, writeRateLimiter, postSimulationAnswer);

module.exports = interviewSimulatorRoutes;
