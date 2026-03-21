const express = require('express');
const {
  deleteSimulationSession,
  getSimulationDetails,
  getSimulationHistoryList,
  postSimulationAnswer,
  postSimulationStart,
} = require('../controllers/interviewSimulatorController');
const { aiRateLimiter, writeRateLimiter } = require('../middlewares/rateLimiter');

const interviewSimulatorRoutes = express.Router();

interviewSimulatorRoutes.get('/history', aiRateLimiter, getSimulationHistoryList);
interviewSimulatorRoutes.get('/:id', aiRateLimiter, getSimulationDetails);
interviewSimulatorRoutes.delete('/:id', writeRateLimiter, deleteSimulationSession);
interviewSimulatorRoutes.post('/start', aiRateLimiter, writeRateLimiter, postSimulationStart);
interviewSimulatorRoutes.post('/:id/answer', aiRateLimiter, writeRateLimiter, postSimulationAnswer);

module.exports = interviewSimulatorRoutes;
