import express from 'express';
import { User } from '../models/User';
import { createLogger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validateRegistration, validateLogin } from '../middleware/validation';
import { AppError } from '../middleware/errorHandler';

const router = express.Router();
const logger = createLogger('user-routes');

// Register new user
router.post('/register', validateRegistration, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(400, 'User already exists');
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    next(error);
  }
});

// Login user
router.post('/login', validateLogin, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const user = await User.findById(req.user?.userId).select('-password');
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update user preferences
router.put('/preferences', authMiddleware, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { preferences } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      { preferences },
      { new: true }
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
});

// Get saved grants
router.get('/saved-grants', authMiddleware, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const user = await User.findById(req.user?.userId)
      .select('savedGrants')
      .populate('savedGrants');

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json(user.savedGrants);
  } catch (error) {
    next(error);
  }
});

// Save a grant
router.post('/saved-grants/:grantId', authMiddleware, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { grantId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      { $addToSet: { savedGrants: grantId } },
      { new: true }
    ).select('savedGrants');

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json(user.savedGrants);
  } catch (error) {
    next(error);
  }
});

// Remove a saved grant
router.delete('/saved-grants/:grantId', authMiddleware, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const { grantId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      { $pull: { savedGrants: grantId } },
      { new: true }
    ).select('savedGrants');

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json(user.savedGrants);
  } catch (error) {
    next(error);
  }
});

export default router;
