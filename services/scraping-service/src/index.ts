import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connect } from 'mongoose';
import cron from 'node-cron';
import { scrapingRouter } from './routes/scraping.routes';
import { GrantScraper } from './services/grant-scraper.service';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 4003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/scraping', scrapingRouter);

// Error handling
app.use(errorHandler);

// Schedule scraping jobs
const scheduleScraping = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Starting scheduled grant scraping');
      const scraper = new GrantScraper();
      await scraper.scrapeAllSources();
      logger.info('Completed scheduled grant scraping');
    } catch (error) {
      logger.error('Error in scheduled scraping:', error);
    }
  });
};

// Database connection and server startup
const startServer = async () => {
  try {
    await connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/grantmatcher');
    
    app.listen(port, () => {
      logger.info(`Scraping Service listening on port ${port}`);
      scheduleScraping();
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
