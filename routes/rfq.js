const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
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
const VALID_TIMELINES = new Set(['immediate', '2-4-weeks', '1-3-months', 'flexible']);
const VALID_CONTACT_METHODS = new Set(['phone', 'email', 'whatsapp']);
const MAX_LENGTHS = {
  name: 120, email: 190, phone: 30, company: 160,
  bore: 60, stroke: 60, pressure: 60, tonnage: 60, message: 2000,
  quantity: 60, applicationDetails: 1000, budgetRange: 80, bestTimeToCall: 80,
};

// ---------- optional drawing/spec attachment ----------
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'rfq');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf', 'image/png', 'image/jpeg',
]);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    // Never trust the client's filename — generate our own and keep the
    // original only as metadata (attachment_original_name in the DB).
    const ext = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' }[file.mimetype] || '';
    cb(null, crypto.randomBytes(20).toString('hex') + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
  },
}).single('attachment');

// Wraps multer so its errors (bad file type, too large) become the same
// JSON error shape as the rest of this endpoint instead of an unhandled
// exception / default Express error page.
function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Attachment must be under 5 MB.'
        : 'Could not process the attachment.';
      return res.status(400).json({ success: false, message, errors: { attachment: message } });
    }
    if (err) return next(err);
    // multer silently drops files that fail fileFilter — req.file will be
    // undefined. If the client's form actually had a file field with
    // content but no req.file came through, it was rejected for type.
    next();
  });
}

function validate(body) {
  const errors = {};
  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const productCategory = (body.productCategory || '').trim();
  const timeline = (body.timeline || '').trim();
  const preferredContact = (body.preferredContact || '').trim();

  if (name.length < 2) errors.name = 'Enter your full name.';
  else if (name.length > MAX_LENGTHS.name) errors.name = `Keep it under ${MAX_LENGTHS.name} characters.`;

  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  else if (email.length > MAX_LENGTHS.email) errors.email = `Keep it under ${MAX_LENGTHS.email} characters.`;

  if (phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number.';
  else if (phone.length > MAX_LENGTHS.phone) errors.phone = `Keep it under ${MAX_LENGTHS.phone} characters.`;

  if (!VALID_CATEGORIES.has(productCategory)) errors.productCategory = 'Select a product category.';

  if (timeline && !VALID_TIMELINES.has(timeline)) errors.timeline = 'Select a valid timeline.';
  if (preferredContact && !VALID_CONTACT_METHODS.has(preferredContact)) errors.preferredContact = 'Select a valid contact method.';

  if ((body.company || '').length > MAX_LENGTHS.company) errors.company = 'Company name is too long.';
  if ((body.message || '').length > MAX_LENGTHS.message) errors.message = `Keep the message under ${MAX_LENGTHS.message} characters.`;
  ['bore', 'stroke', 'pressure', 'tonnage', 'quantity', 'applicationDetails', 'budgetRange', 'bestTimeToCall'].forEach((field) => {
    if ((body[field] || '').length > MAX_LENGTHS[field]) errors[field] = 'Too long.';
  });

  return errors;
}

router.post('/', rfqLimiter, handleUpload, async (req, res) => {
  const cleanupUpload = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  try {
    // Honeypot: a hidden field real visitors never fill in. Bots that
    // auto-fill every input trip this and get a fake-success response.
    if (req.body.website) {
      cleanupUpload();
      return res.json({ success: true, message: 'Thank you — your request has been received.' });
    }

    const errors = validate(req.body);
    if (Object.keys(errors).length > 0) {
      cleanupUpload();
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
      quantity: (req.body.quantity || '').trim(),
      timeline: (req.body.timeline || '').trim(),
      applicationDetails: (req.body.applicationDetails || '').trim(),
      budgetRange: (req.body.budgetRange || '').trim(),
      preferredContact: (req.body.preferredContact || '').trim(),
      bestTimeToCall: (req.body.bestTimeToCall || '').trim(),
      attachmentFilename: req.file ? req.file.filename : null,
      attachmentOriginalName: req.file ? req.file.originalname.slice(0, 200) : null,
      attachmentMime: req.file ? req.file.mimetype : null,
      attachmentSize: req.file ? req.file.size : null,
    });

    return res.json({
      success: true,
      message: 'Thank you — your request has been received. Our engineering team will reach out within one business day.',
      id: row.id,
    });
  } catch (err) {
    cleanupUpload();
    console.error('[rfq] Failed to save submission:', err);
    return res.status(500).json({
      success: false,
      message: 'We could not save your request right now. Please try again, or call us directly.',
    });
  }
});

module.exports = router;
