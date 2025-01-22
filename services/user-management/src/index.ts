import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './config/database';
import { createLogger } from './utils/logger';
import userRoutes from './routes/user.routes';
import profileRoutes from './routes/profile.routes';
import recommendationRoutes from './routes/recommendation.routes';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env') });

const logger = createLogger('app');
const app = express();
const port = process.env.PORT || 3002;

// Connect to MongoDB
connectDB().then(() => {
  // Middleware
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  }));
  app.use(express.json());

  // Routes
  app.use('/api/users', userRoutes);
  app.use('/api/profiles', authMiddleware, profileRoutes);
  app.use('/api/recommendations', authMiddleware, recommendationRoutes);

  // Error handling middleware
  app.use(errorHandler);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Start server
  app.listen(port, () => {
    logger.info(`User Management Service listening on port ${port}`);
  });
}).catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
