import { Router } from 'express';
import { RecommendationService } from '../services/recommendation.service';
import { logger } from '../utils/logger';

const router = Router();

// Get recommendations based on deck analysis
router.post('/match', async (req, res, next) => {
  try {
    const { deckAnalysis, filters } = req.body;

    if (!deckAnalysis) {
      return res.status(400).json({
        status: 'error',
        message: 'Deck analysis is required',
      });
    }

    const recommendations = await RecommendationService.getRecommendations(
      deckAnalysis,
      filters
    );

    res.json({
      status: 'success',
      data: recommendations,
    });
  } catch (error) {
    logger.error('Error in recommendation matching:', error);
    next(error);
  }
});

// Get recommendation by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const recommendation = await RecommendationService.getRecommendationById(id);

    if (!recommendation) {
      return res.status(404).json({
        status: 'error',
        message: 'Recommendation not found',
      });
    }

    res.json({
      status: 'success',
      data: recommendation,
    });
  } catch (error) {
    logger.error('Error fetching recommendation:', error);
    next(error);
  }
});

// Update recommendation feedback
router.post('/:id/feedback', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({
        status: 'error',
        message: 'Feedback is required',
      });
    }

    const updatedRecommendation = await RecommendationService.updateFeedback(
      id,
      feedback
    );

    res.json({
      status: 'success',
      data: updatedRecommendation,
    });
  } catch (error) {
    logger.error('Error updating recommendation feedback:', error);
    next(error);
  }
});

export const recommendationRouter = router;
