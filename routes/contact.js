const express = require('express');
const { contactRateLimiter } = require('../middleware/rateLimiter');
const { contactValidationRules, validateContactForm } = require('../middleware/validation');
const { sendEmailNotification, sendAutoReply } = require('../utils/email');
const { saveInquiry } = require('../db');
const { logger } = require('../utils/logger');

const router = express.Router();

router.post(
  '/',
  contactRateLimiter,
  contactValidationRules,
  validateContactForm,
  async (req, res, next) => {
    try {
      const { name, email, phone, company, service, message, website } = req.body;
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // Honeypot spam protection
      if (website && website.trim() !== '') {
        logger.warn(`Spam bot blocked via honeypot. IP: ${ip}`);
        return res.status(200).json({ success: true, message: 'Message received.' });
      }

      // Save to database
      try {
        await saveInquiry({
          stakeholder_name: name,
          email,
          phone,
          company_name: company,
          service_required: service,
          message
        });
      } catch (dbError) {
        logger.error(`Database save failed: ${dbError.message}`);
        // Continuing execution even if DB fails, as per standard requirement
      }

      // Send emails in parallel to avoid hitting Vercel timeouts
      const emailData = { name, email, phone, company, service, message, ip };
      
      try {
        await Promise.all([
          sendEmailNotification(emailData),
          sendAutoReply(emailData)
        ]);
        logger.info(`Successfully processed inquiry and dispatched emails for ${email}`);
      } catch (emailError) {
        logger.error(`Email dispatch failed: ${emailError.message}`);
        return res.status(500).json({
          success: false,
          message: "Failed to send enquiry."
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Enquiry submitted successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
