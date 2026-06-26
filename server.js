require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON parse middleware with size limits to prevent DOS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve static frontend files (only locally; Vercel handles this natively)
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Custom memory-based rate limiter middleware
const ipRequestHistory = {};
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function rateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  if (!ipRequestHistory[ip]) {
    ipRequestHistory[ip] = [];
  }

  // Filter timestamps to only keep those within the current window
  ipRequestHistory[ip] = ipRequestHistory[ip].filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (ipRequestHistory[ip].length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      message: 'Too many ingestion requests from this terminal. Please pause for 15 minutes.'
    });
  }

  ipRequestHistory[ip].push(now);
  next();
}

// Custom memory-based duplicate check to prevent duplicate submissions
const submissionCache = [];
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

function checkDuplicateSubmission(email, message) {
  const now = Date.now();
  // Remove expired entries from cache
  const cleanIndex = submissionCache.findIndex((entry) => now - entry.timestamp >= DUPLICATE_WINDOW_MS);
  if (cleanIndex !== -1) {
    submissionCache.splice(0, cleanIndex + 1);
  }

  // Check if current submission matches any active cache entry
  const exists = submissionCache.some(
    (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.message === message
  );

  if (exists) {
    return true;
  }

  // Add current to cache
  submissionCache.push({ email, message, timestamp: now });
  return false;
}

// Input Sanitization utility against Cross-Site Scripting (XSS)
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// Initialize Nodemailer transporter
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  console.warn(
    '[MAIL_SYS] WARNING: EMAIL_USER and EMAIL_PASS environment variables are missing. Mail service will run in log-only mock mode.'
  );
}

// Contact Route
app.post('/api/contact', rateLimiter, async (req, res) => {
  try {
    const { name, email, message, website } = req.body;

    // 1. Honeypot Spam Protection
    // Honeypot field (hidden from real users). If filled, reject silently as bot submission.
    if (website && website.trim() !== '') {
      console.warn(`[SECURITY] Spam bot detected and blocked via honeypot. IP: ${req.socket.remoteAddress}`);
      // Return 200/success to bot to avoid alerting the bot script
      return res.status(200).json({ success: true, bot: true });
    }

    // 2. Input Sanitization
    const sanitizedName = sanitizeInput(name);
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedMessage = sanitizeInput(message);

    // 3. Validation Rules
    if (!sanitizedName) {
      return res.status(400).json({ success: false, message: 'Stakeholder Name is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({ success: false, message: 'A valid corporate email address is required.' });
    }

    if (!sanitizedMessage || sanitizedMessage.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry description must be at least 20 characters.'
      });
    }

    // 4. Duplicate Check
    if (checkDuplicateSubmission(sanitizedEmail, sanitizedMessage)) {
      return res.status(409).json({
        success: false,
        message: 'A duplicate request was detected. Please wait 2 minutes before resubmitting the same inquiry.'
      });
    }

    // 5. Save in Database
    console.log(`[PROCESS] Ingesting client inquiry into database...`);
    const savedRecord = await db.saveInquiry({
      stakeholder_name: sanitizedName,
      email: sanitizedEmail,
      message: sanitizedMessage
    });
    console.log(`[DATABASE] Success: Record saved with ID: ${savedRecord.id}`);

    // 6. Send Mail Notification
    const formattedDate = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
    const emailSubject = `New Portfolio Contact Request from ${sanitizedName}`;
    const emailBody = `Stakeholder Name:\n${sanitizedName}\n\nCorporate Email:\n${sanitizedEmail}\n\nMessage:\n${sanitizedMessage}\n\nSubmitted At:\n${formattedDate}`;

    if (transporter) {
      try {
        console.log(`[MAIL_SYS] Dispatching notification mail to ${process.env.EMAIL_USER}...`);
        await transporter.sendMail({
          from: `"${sanitizedName}" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          replyTo: sanitizedEmail,
          subject: emailSubject,
          text: emailBody
        });
        console.log(`[MAIL_SYS] Success: Notification mail sent.`);
      } catch (mailErr) {
        // Mail failure is non-fatal — inquiry is already saved to the database
        console.error(`[MAIL_SYS] WARNING: Mail delivery failed (check EMAIL_PASS in .env): ${mailErr.message}`);
      }
    } else {
      console.log(`[MAIL_SYS] [MOCK DELIVERY] Dispatching simulated mail...`);
      console.log(`----------------------------------------`);
      console.log(`TO: thakurweirdo@gmail.com`);
      console.log(`SUBJECT: ${emailSubject}`);
      console.log(`BODY:\n${emailBody}`);
      console.log(`----------------------------------------`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[SYS_ERR] Fatal request handling failure:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while processing transaction. Please retry.'
    });
  }
});

// Backward compatibility helper route for old frontend requests
app.post('/api/submit', rateLimiter, async (req, res) => {
  console.log('[SYS_KERN] Legacy API endpoint /api/submit hit. Redirecting to /api/contact handler.');
  // Rewrite request body properties to match new format if necessary
  // The old code sends { name, email, message }, which is identical
  req.url = '/api/contact';
  app._router.handle(req, res);
});

// Serve index.html as fallback for SPA routing or errors (only locally)
if (!process.env.VERCEL) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Initialize database and start web server
async function startServer() {
  try {
    await db.initDb();
    app.listen(PORT, () => {
      console.log(`[SYS_KERN] Core Web Engine online. Listening at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[SYS_KERN] Critical system start abort due to initialization error:', err);
    process.exit(1);
  }
}

// If running in Vercel, don't start the server directly.
// Vercel serverless functions will import the 'app' export instead.
if (process.env.VERCEL) {
  module.exports = app;
} else {
  startServer();
}
