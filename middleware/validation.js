const { body, validationResult } = require('express-validator');

const contactValidationRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full Name is required.')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Must be a valid email address.')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .escape(),
  body('company')
    .optional()
    .trim()
    .escape(),
  body('service')
    .optional()
    .trim()
    .escape(),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ min: 10 }).withMessage('Message must be at least 10 characters.')
    .escape()
];

const validateContactForm = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

  return res.status(400).json({
    success: false,
    errors: extractedErrors
  });
};

module.exports = {
  contactValidationRules,
  validateContactForm
};
