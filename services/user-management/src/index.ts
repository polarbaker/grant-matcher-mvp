import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createConnection } from 'typeorm';
import { userRouter } from './routes/user.routes';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);

// Error handling
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    await createConnection({
      type: 'postgres',
      url: process.env.POSTGRES_URI,
      entities: ['src/entities/*.ts'],
      synchronize: true, // Only in development
    });

    app.listen(port, () => {
      logger.info(`User Management Service listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
