const helmet = require('helmet');
const cors = require('cors');

const securityMiddleware = [
  helmet(),
  cors({
    origin: '*', // Adjust to match frontend origin in production
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
];

module.exports = securityMiddleware;
