import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createLogger } from '../utils/logger';

const logger = createLogger('test-setup');

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  try {
    // Set up environment variables for testing
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  } catch (error) {
    logger.error('Error in test setup:', error);
    throw error;
  }
});

beforeEach(async () => {
  try {
    if (mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      for (let collection of collections) {
        await collection.deleteMany({});
      }
    }
  } catch (error) {
    logger.error('Error clearing test database:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongoServer.stop();
  } catch (error) {
    logger.error('Error in test cleanup:', error);
    throw error;
  }
});
