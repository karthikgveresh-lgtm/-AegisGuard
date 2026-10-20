const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const transactionsRouter = require('./routes/transactions');
const { handleStreamConnection } = require('./routes/stream');
const metricsRouter = require('./routes/metrics');
const simulationRouter = require('./routes/simulation');
const db = require('./repositories/db');
const { runSeed } = require('./seed/seed');

const app = express();
const PORT = process.env.PORT || 4000;

// Security hygiene: Helmet for HTTP response security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration for local React Vite client and Cloud Run
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting for standard DDoS defense (allowing hackathon demos and attack simulation)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again shortly.' }
});

app.use(generalLimiter);
app.use(express.json({ limit: '1mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'real-time-fraud-scoring-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Real-time Server-Sent Events endpoint
app.get('/api/stream', handleStreamConnection);

// Business Routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/simulate', simulationRouter);

// Reset demo state endpoint (re-seeds users, trusted devices, last-transaction history)
const { streamManager } = require('./routes/stream');
const transactionRepository = require('./repositories/transactionRepository');

app.post('/api/demo/reset', (req, res) => {
  try {
    console.log('[Server] POST /api/demo/reset received: Re-seeding database baseline...');
    runSeed();
    const metrics = transactionRepository.getMetrics();
    streamManager.broadcast('DEMO_RESET', { message: 'Demo state reset to initial baseline' });
    streamManager.broadcast('METRICS_UPDATED', metrics);
    return res.status(200).json({
      success: true,
      message: 'Demo state reset successfully. Re-seeded 5 user baselines, trusted devices, and historical transactions.',
      metrics
    });
  } catch (err) {
    console.error('[Server] Failed to reset demo state:', err);
    return res.status(500).json({
      error: 'Failed to reset demo state',
      message: err.message
    });
  }
});

// Auto-seed database if empty on startup
try {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    console.log('[Server] Database is empty. Running initial seed...');
    runSeed();
  }
} catch (err) {
  console.warn('[Server] Could not check/seed database on startup:', err.message);
}

// Global 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🛡️  FRAUD RISK SCORING MICROSERVICE LISTENING ON :${PORT}`);
  console.log(`   - Stream SSE:   http://localhost:${PORT}/api/stream`);
  console.log(`   - Evaluate API: http://localhost:${PORT}/api/transactions/evaluate`);
  console.log(`   - Metrics:      http://localhost:${PORT}/api/metrics`);
  console.log(`====================================================`);
});

module.exports = { app, server };
