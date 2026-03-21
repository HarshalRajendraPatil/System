const express = require('express');
const {
  getKanban,
  getMetrics,
  getProject,
  patchMoveProject,
  postProject,
  putProject,
  removeProject,
} = require('../controllers/projectController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const projectRoutes = express.Router();

projectRoutes.get('/kanban', getKanban);
projectRoutes.get('/metrics', getMetrics);
projectRoutes.get('/:id', getProject);
projectRoutes.post('/', writeRateLimiter, postProject);
projectRoutes.put('/:id', writeRateLimiter, putProject);
projectRoutes.patch('/:id/move', writeRateLimiter, patchMoveProject);
projectRoutes.delete('/:id', writeRateLimiter, removeProject);

module.exports = projectRoutes;
