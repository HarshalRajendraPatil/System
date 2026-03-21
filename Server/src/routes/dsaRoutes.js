const express = require('express');
const {
  deleteProblem,
  getProblemsList,
  getProblemStats,
  postDSAProblem,
  putDSAProblem,
} = require('../controllers/dsaController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const dsaRoutes = express.Router();

dsaRoutes.post('/problems', writeRateLimiter, postDSAProblem);
dsaRoutes.get('/problems', getProblemsList);
dsaRoutes.get('/stats', getProblemStats);
dsaRoutes.put('/problems/:id', writeRateLimiter, putDSAProblem);
dsaRoutes.delete('/problems/:id', writeRateLimiter, deleteProblem);

module.exports = dsaRoutes;
