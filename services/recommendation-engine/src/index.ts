import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { logger } from './utils/logger';
import recommendationRoutes from './routes/recommendation.routes';

const app = express();
const port = parseInt(process.env.PORT || '4002', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/recommendations', recommendationRoutes);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/grant-matcher';

mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
  })
  .catch((error) => {
    logger.error('Error connecting to MongoDB:', error);
  });

// Start server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
