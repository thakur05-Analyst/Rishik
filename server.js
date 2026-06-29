require('dotenv').config();
const express = require('express');
const securityMiddleware = require('./middleware/security');
const { errorHandler } = require('./middleware/errorMiddleware');
const { requestLogger, logger } = require('./utils/logger');
const { initDb } = require('./db');

const contactRoutes = require('./routes/contact');
const statusRoutes = require('./routes/status');

const app = express();
const PORT = process.env.PORT || 3000;

// Apply Security Middleware (Helmet, CORS)
app.use(securityMiddleware);

// Middleware for parsing requests
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging Middleware
app.use(requestLogger);

const path = require('path');

// API Routes
app.use('/api/contact', contactRoutes);
app.use('/api', statusRoutes);

// Serve static frontend files (only locally)
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Serve index.html as fallback for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
} else {
  // Unmatched routes handler for API in Vercel
  app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
  });
}

// Centralized Error Handling Middleware
app.use(errorHandler);

// Initialize DB and start server locally
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      logger.info(`Core Web Engine online. Listening at http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error(`Critical system start abort due to initialization error: ${err.message}`);
    process.exit(1);
  }
}

// Export for Vercel Serverless, or start if running locally
if (process.env.VERCEL) {
  module.exports = app;
} else {
  startServer();
}
