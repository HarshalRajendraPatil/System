const express = require('express');
const { authenticateRequest } = require('../middlewares/auth');
const authRoutes = require('./authRoutes');
const rpgRoutes = require('./rpgRoutes');
const dsaRoutes = require('./dsaRoutes');
const lldHldRoutes = require('./lldHldRoutes');
const projectRoutes = require('./projectRoutes');
const mockRoutes = require('./mockRoutes');
const behavioralRoutes = require('./behavioralRoutes');
const aiRoutes = require('./aiRoutes');

const routes = express.Router();

routes.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GrindForge API is healthy',
    timestamp: new Date().toISOString(),
  });
});

routes.use('/auth', authRoutes);
routes.use('/rpg', authenticateRequest, rpgRoutes);
routes.use('/dsa', authenticateRequest, dsaRoutes);
routes.use('/lld-hld', authenticateRequest, lldHldRoutes);
routes.use('/projects', authenticateRequest, projectRoutes);
routes.use('/mocks', authenticateRequest, mockRoutes);
routes.use('/behavioral', authenticateRequest, behavioralRoutes);
routes.use('/ai', authenticateRequest, aiRoutes);

module.exports = routes;
