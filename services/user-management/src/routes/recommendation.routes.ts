import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';
import { RecommendationService } from '../services/recommendation.service';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();
const logger = createLogger('recommendation-routes');
const recommendationService = new RecommendationService();

// Get recommendations for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const filters = req.query.filters ? JSON.parse(req.query.filters as string) : undefined;

    const recommendations = await recommendationService.getRecommendations(
      req.user!.userId,
      page,
      limit,
      filters
    );

    res.json({
      recommendations: recommendations.items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(recommendations.total / limit),
        totalItems: recommendations.total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ message: 'Invalid filters format' });
    }
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ message: 'Error fetching recommendations' });
  }
});

// Refresh recommendations
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const result = await recommendationService.refreshRecommendations(req.user!.userId);
    res.json({ 
      success: true, 
      message: 'Recommendations refreshed successfully',
      newRecommendations: result.count
    });
  } catch (error) {
    logger.error('Error refreshing recommendations:', error);
    res.status(500).json({ message: 'Error refreshing recommendations' });
  }
});

// Get recommendation by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const recommendation = await recommendationService.getRecommendationById(
      req.user!.userId,
      req.params.id
    );

    if (!recommendation) {
      return res.status(404).json({ message: 'Recommendation not found' });
    }

    res.json(recommendation);
  } catch (error) {
    logger.error('Error fetching recommendation:', error);
    res.status(500).json({ message: 'Error fetching recommendation' });
  }
});

// Update recommendation status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['interested', 'not_interested', 'applied', 'saved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const recommendation = await recommendationService.updateRecommendationStatus(
      req.user!.userId,
      req.params.id,
      status
    );

    if (!recommendation) {
      return res.status(404).json({ message: 'Recommendation not found' });
    }

    res.json(recommendation);
  } catch (error) {
    logger.error('Error updating recommendation status:', error);
    res.status(500).json({ message: 'Error updating recommendation status' });
  }
});

export default router;
