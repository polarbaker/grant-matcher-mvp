import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connect } from 'mongoose';
import { recommendationRouter } from './routes/recommendation.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 4002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/recommendations', recommendationRouter);

// Error handling
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    await connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/grantmatcher');
    
    app.listen(port, () => {
      logger.info(`Recommendation Engine Service listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
