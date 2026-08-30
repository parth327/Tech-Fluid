const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../db');

// 10 submissions per 15 minutes per IP — generous for a real buyer,
// tight enough to blunt scripted spam.
const rfqLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again in a few minutes.' },
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_CATEGORIES = new Set(['cylinders', 'power-packs', 'jacks', 'other']);
const MAX_LENGTHS = {
  name: 120, email: 190, phone: 30, company: 160,
  bore: 60, stroke: 60, pressure: 60, tonnage: 60, message: 2000,
};

function validate(body) {
  const errors = {};
  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const productCategory = (body.productCategory || '').trim();

  if (name.length < 2) errors.name = 'Enter your full name.';
  else if (name.length > MAX_LENGTHS.name) errors.name = `Keep it under ${MAX_LENGTHS.name} characters.`;

  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  else if (email.length > MAX_LENGTHS.email) errors.email = `Keep it under ${MAX_LENGTHS.email} characters.`;

  if (phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number.';
  else if (phone.length > MAX_LENGTHS.phone) errors.phone = `Keep it under ${MAX_LENGTHS.phone} characters.`;

  if (!VALID_CATEGORIES.has(productCategory)) errors.productCategory = 'Select a product category.';

  if ((body.company || '').length > MAX_LENGTHS.company) errors.company = 'Company name is too long.';
  if ((body.message || '').length > MAX_LENGTHS.message) errors.message = `Keep the message under ${MAX_LENGTHS.message} characters.`;
  ['bore', 'stroke', 'pressure', 'tonnage'].forEach((field) => {
    if ((body[field] || '').length > MAX_LENGTHS[field]) errors[field] = 'Too long.';
  });

  return errors;
}

router.post('/', rfqLimiter, async (req, res) => {
  try {
    // Honeypot: a hidden field real visitors never fill in. Bots that
    // auto-fill every input trip this and get a fake-success response.
    if (req.body.website) {
      return res.json({ success: true, message: 'Thank you \u2014 your request has been received.' });
    }

    const errors = validate(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Please correct the highlighted fields.', errors });
    }

    const row = await db.insertRfq({
      name: req.body.name.trim(),
      email: req.body.email.trim(),
      phone: req.body.phone.trim(),
      company: (req.body.company || '').trim(),
      productCategory: req.body.productCategory.trim(),
      bore: (req.body.bore || '').trim(),
      stroke: (req.body.stroke || '').trim(),
      pressure: (req.body.pressure || '').trim(),
      tonnage: (req.body.tonnage || '').trim(),
      message: (req.body.message || '').trim(),
    });

    return res.json({
      success: true,
      message: 'Thank you \u2014 your request has been received. Our engineering team will reach out within one business day.',
      id: row.id,
    });
  } catch (err) {
    console.error('[rfq] Failed to save submission:', err);
    return res.status(500).json({
      success: false,
      message: 'We could not save your request right now. Please try again, or call us directly.',
    });
  }
});

module.exports = router;
