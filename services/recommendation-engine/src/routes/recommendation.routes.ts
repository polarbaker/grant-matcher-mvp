import { Router } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { validateRequest } from '../middleware/validation';

const router = Router();

/**
 * Get recommendations for a user
 */
router.post('/recommendations', validateRequest(), async (req, res, next) => {
  try {
    const recommendations = await recommendationService.getRecommendationsForUser(req.body);
    return res.json(recommendations);
  } catch (error) {
    return next(error);
  }
});

/**
 * Get cached recommendations for a user
 */
router.get('/recommendations/:userId', async (req, res, next) => {
  try {
    const recommendations = await recommendationService.getCachedRecommendations(req.params.userId);
    if (!recommendations) {
      return res.status(404).json({ message: 'No cached recommendations found' });
    }
    return res.json(recommendations);
  } catch (error) {
    return next(error);
  }
});

/**
 * Clear cached recommendations for a user
 */
router.delete('/recommendations/:userId/cache', async (req, res, next) => {
  try {
    await recommendationService.cacheRecommendations(req.params.userId, []);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
