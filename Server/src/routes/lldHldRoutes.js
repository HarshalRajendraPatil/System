const express = require('express');

const {
  postLLDHLDDesign,
  getLLDHLDDesignsList,
  getLLDHLDDesignDetail,
  putLLDHLDDesign,
  patchLLDHLDCompletion,
  deleteLLDHLDDesignItem,
  getLLDHLDDesignStats,
  getLLDHLDTags,
} = require('../controllers/lldHldController');
const { writeRateLimiter } = require('../middlewares/rateLimiter');

const lldHldRoutes = express.Router();

// Create a new design
lldHldRoutes.post('/', writeRateLimiter, postLLDHLDDesign);

// Get design statistics (must be before /:id routes)
lldHldRoutes.get('/stats', getLLDHLDDesignStats);

// Get all unique tags (must be before /:id routes)
lldHldRoutes.get('/tags', getLLDHLDTags);

// Get all designs with filters
lldHldRoutes.get('/', getLLDHLDDesignsList);

// Get a specific design by ID
lldHldRoutes.get('/:id', getLLDHLDDesignDetail);

// Toggle completion status (must be before PUT /:id)
lldHldRoutes.patch('/:id/completion', writeRateLimiter, patchLLDHLDCompletion);

// Update a design
lldHldRoutes.put('/:id', writeRateLimiter, putLLDHLDDesign);

// Delete a design
lldHldRoutes.delete('/:id', writeRateLimiter, deleteLLDHLDDesignItem);

module.exports = lldHldRoutes;
