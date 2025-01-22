import { Router } from 'express';
import multer from 'multer';
import { recommendationService } from '../services/recommendation.service';
import { validateRequest } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';
import { ERROR_MESSAGES, FILE_LIMITS } from '../constants';
import { recommendationSchema } from '../schemas/recommendation.schema';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: FILE_LIMITS.MAX_SIZE // 10MB
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype === 'application/pdf') {
      callback(null, true);
    } else {
      callback(new Error('Only PDF files are allowed') as any, false);
    }
  }
});

// Get recommendations for user
router.post('/recommendations', validateRequest(recommendationSchema), async (req, res, next) => {
  try {
    const recommendations = await recommendationService.getRecommendationsForUser(req.body);
    logger.info('Recommendations retrieved for user', { userId: req.body.userId });

    res.json(recommendations);
  } catch (error) {
    next(error);
  }
});

// Refresh recommendations for user
router.post('/recommendations/refresh', async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      throw new AppError(400, 'User ID is required');
    }

    await recommendationService.refreshRecommendations(userId);
    logger.info('Recommendations refresh triggered for user', { userId });

    res.json({
      status: 'success',
      message: 'Recommendations refresh triggered'
    });
  } catch (error) {
    next(error);
  }
});

// Upload and analyze pitch deck
router.post('/deck/analyze', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, ERROR_MESSAGES.INVALID_FILE_TYPE);
    }

    const analysis = await recommendationService.analyzeDeck(req.file);
    logger.info('Deck analysis completed');

    res.json({
      status: 'success',
      data: analysis
    });
  } catch (error) {
    next(error);
  }
});

export default router;
