import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
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
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
