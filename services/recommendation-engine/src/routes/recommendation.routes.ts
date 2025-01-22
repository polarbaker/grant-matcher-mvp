import express, { Request, Response } from 'express';
import multer from 'multer';
import { RecommendationService } from '../services/recommendation.service';
import { logger } from '../utils/logger';
import { Grant } from '../models/Grant';

interface MulterRequest extends Request {
  file?: any;
}

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and PPTX files are allowed'));
    }
  }
});

// Analyze deck and return analysis
router.post('/deck-analysis/analyze', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded',
      });
    }

    // For now, return a mock analysis
    // TODO: Implement actual deck analysis
    const mockAnalysis = {
      topics: ['technology', 'healthcare', 'innovation'],
      fundingNeeds: {
        amount: 500000,
        timeline: '12 months',
      },
      teamSize: 5,
      stage: 'seed',
      traction: {
        revenue: 100000,
        users: 1000,
      }
    };

    res.json({
      status: 'success',
      data: mockAnalysis,
    });
  } catch (error) {
    logger.error('Error analyzing deck:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze deck',
    });
  }
});

// Create a new grant
router.post('/grants', async (req: Request, res: Response) => {
  try {
    const grantData = req.body;
    const grant = new Grant(grantData);
    await grant.save();

    res.status(201).json({
      status: 'success',
      data: grant,
    });
  } catch (error) {
    logger.error('Error creating grant:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create grant',
    });
  }
});

// Get recommendations based on deck analysis
router.post('/match', async (req: Request, res: Response) => {
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
    res.status(500).json({
      status: 'error',
      message: 'Failed to get recommendations',
    });
  }
});

// Get recommendations by ID
router.get('/:id', async (req: Request, res: Response) => {
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
    logger.error('Error getting recommendation by ID:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get recommendation',
    });
  }
});

// Update recommendation feedback
router.post('/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, rating, comment, status } = req.body;

    if (!userId || !rating || !status) {
      return res.status(400).json({
        status: 'error',
        message: 'userId, rating, and status are required',
      });
    }

    const updatedRecommendation = await RecommendationService.updateFeedback(
      id,
      { userId, rating, comment, status }
    );

    res.json({
      status: 'success',
      data: updatedRecommendation,
    });
  } catch (error) {
    logger.error('Error updating recommendation feedback:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update recommendation feedback',
    });
  }
});

export default router;
