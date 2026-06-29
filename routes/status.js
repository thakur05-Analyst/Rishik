const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.get('/status', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    service: 'portfolio-backend',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

module.exports = router;
