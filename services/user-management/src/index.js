const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { createClient } = require('redis');
const authRouter = require('./routes/auth.routes');

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Database connections
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI || 'postgresql://postgres:postgres@postgres:5432/grantmatcher'
});

const redisClient = createClient({
  url: process.env.REDIS_URI || 'redis://redis:6379'
});

redisClient.connect().catch(console.error);

// Routes
app.use('/api/auth', authRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

app.listen(port, () => {
  console.log(`User management service listening at http://localhost:${port}`);
});
