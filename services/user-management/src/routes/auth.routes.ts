import { Router } from 'express';
import { body } from 'express-validator';
import { getRepository } from 'typeorm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../entities/User';
import { validateRequest } from '../middleware/validate.middleware';

const router = Router();

// Register new user
router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    validateRequest,
  ],
  async (req, res) => {
    try {
      const userRepository = getRepository(User);
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const user = userRepository.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      await userRepository.save(user);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.status(201).json({ user, token });
    } catch (error) {
      res.status(500).json({ message: 'Error creating user' });
    }
  }
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
    validateRequest,
  ],
  async (req, res) => {
    try {
      const userRepository = getRepository(User);
      const { email, password } = req.body;

      // Find user
      const user = await userRepository.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({ user, token });
    } catch (error) {
      res.status(500).json({ message: 'Error logging in' });
    }
  }
);

export const authRouter = router;
