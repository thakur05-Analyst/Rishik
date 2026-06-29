const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    // Optional: Only include stack trace in development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = {
  errorHandler
};
