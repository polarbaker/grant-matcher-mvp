import express from 'express';
import { Profile } from '../models/Profile';
import { createLogger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import { validateProfile } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();
const logger = createLogger('profile-routes');

// Get user profile
router.get('/', authMiddleware, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user?.userId });
    
    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    res.json(profile);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Error fetching profile');
  }
});

// Create or update profile
router.put('/', authMiddleware, validateProfile, async (req, res) => {
  try {
    const profileData = {
      ...req.body,
      user: req.user?.userId
    };

    const profile = await Profile.findOneAndUpdate(
      { user: req.user?.userId },
      profileData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(profile);
  } catch (error) {
    logger.error('Error updating profile:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Error updating profile');
  }
});

// Update expertise
router.patch('/expertise', authMiddleware, async (req, res) => {
  try {
    const { expertise } = req.body;
    if (!Array.isArray(expertise)) {
      throw new AppError(400, 'Expertise must be an array');
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.user?.userId },
      { $set: { expertise } },
      { new: true, runValidators: true }
    );

    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    res.json(profile);
  } catch (error) {
    logger.error('Error updating expertise:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Error updating expertise');
  }
});

// Add previous grant
router.post('/previous-grants', authMiddleware, async (req, res) => {
  try {
    const { grant } = req.body;
    if (!grant || typeof grant !== 'object') {
      throw new AppError(400, 'Invalid grant data');
    }

    const profile = await Profile.findOneAndUpdate(
      { user: req.user?.userId },
      { $push: { previousGrants: grant } },
      { new: true, runValidators: true }
    );

    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    res.json(profile);
  } catch (error) {
    logger.error('Error adding previous grant:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Error adding previous grant');
  }
});

// Remove previous grant
router.delete('/previous-grants/:grantId', authMiddleware, async (req, res) => {
  try {
    const profile = await Profile.findOneAndUpdate(
      { user: req.user?.userId },
      { $pull: { previousGrants: { _id: req.params.grantId } } },
      { new: true }
    );

    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }

    res.json(profile);
  } catch (error) {
    logger.error('Error removing previous grant:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Error removing previous grant');
  }
});

export default router;
