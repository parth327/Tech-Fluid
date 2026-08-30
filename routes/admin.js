const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../db');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'rfq');

const COOKIE_NAME = 'tfi_admin';
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

function getSecret() {
  // Falls back to a process-lifetime random secret if ADMIN_APP_SECRET
  // isn't set, so a missing env var fails safe (sessions just won't
  // survive a restart) rather than using a predictable default.
  if (!getSecret._value) {
    getSecret._value = process.env.ADMIN_APP_SECRET || crypto.randomBytes(32).toString('hex');
  }
  return getSecret._value;
}

function sign(value) {
  const hmac = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
  return `${value}.${hmac}`;
}

function verify(signed) {
  if (!signed || typeof signed !== 'string' || !signed.includes('.')) return null;
  const idx = signed.lastIndexOf('.');
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  return value;
}

function issueSession(res, remember) {
  const hours = remember ? REMEMBER_DAYS * 24 : SESSION_HOURS;
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  const token = sign(`admin:${expiresAt}`);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: hours * 60 * 60 * 1000,
  });
}

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const value = verify(token);
  if (!value) return res.redirect('/admin/login');
  const [, expiresAtStr] = value.split(':');
  if (!expiresAtStr || Date.now() > Number(expiresAtStr)) {
    res.clearCookie(COOKIE_NAME);
    return res.redirect('/admin/login');
  }
  next();
}

// Same session check, but for JSON API calls from the dashboard's AJAX
// requests — returns 401 JSON instead of redirecting, since a redirect
// response to a fetch() call isn't something the client can act on.
function requireAdminApi(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const value = verify(token);
  if (!value) return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  const [, expiresAtStr] = value.split(':');
  if (!expiresAtStr || Date.now() > Number(expiresAtStr)) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
  next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const VALID_STATUSES = ['new', 'contacted', 'quoted', 'closed'];
const VALID_SORT_COLUMNS = ['created_at', 'name', 'status', 'product_category'];

// ---------- auth ----------

router.get('/login', (req, res) => {
  // Already logged in? Skip straight to the dashboard instead of showing
  // the form again.
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (verify(token)) return res.redirect('/admin');
  res.render('admin-login', {
    pageTitle: 'Admin Login | Tech Fluid Industries',
    metaDescription: 'Staff login.',
    error: null,
  });
});

router.post('/login', loginLimiter, (req, res) => {
  const password = (req.body.password || '').toString();
  const expected = process.env.ADMIN_PASSWORD || '';

  const pwBuf = Buffer.from(password);
  const expBuf = Buffer.from(expected);
  const matches = expected.length > 0
    && pwBuf.length === expBuf.length
    && crypto.timingSafeEqual(pwBuf, expBuf);

  if (!matches) {
    return res.status(401).render('admin-login', {
      pageTitle: 'Admin Login | Tech Fluid Industries',
      metaDescription: 'Staff login.',
      error: expected.length === 0
        ? 'Admin login is not configured yet — set ADMIN_PASSWORD in your environment.'
        : 'Incorrect password.',
    });
  }

  issueSession(res, req.body.remember === 'on' || req.body.remember === 'true');
  res.redirect('/admin');
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.redirect('/admin/login');
});

// ---------- dashboard (Read) ----------

router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const status = VALID_STATUSES.includes(req.query.status) ? req.query.status : null;
    const search = (req.query.q || '').toString().slice(0, 120);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const sort = VALID_SORT_COLUMNS.includes(req.query.sort) ? req.query.sort : 'created_at';
    const dir = req.query.dir === 'asc' ? 'asc' : 'desc';
    const limit = 20;
    const offset = (page - 1) * limit;

    const [{ rows, total }, counts, daily, categories] = await Promise.all([
      db.getAllRfqs({ status, search, limit, offset, sort, dir }),
      db.getRfqStatusCounts(),
      db.getRfqDailyCounts(14),
      db.getRfqCategoryCounts(),
    ]);

    res.render('admin-dashboard', {
      pageTitle: 'RFQ Leads | Admin',
      metaDescription: 'Staff dashboard.',
      leads: rows,
      counts,
      daily,
      categories,
      activeStatus: status,
      search,
      sort,
      dir,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      total,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- CSV export ----------

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

router.get('/export.csv', requireAdmin, async (req, res, next) => {
  try {
    const status = VALID_STATUSES.includes(req.query.status) ? req.query.status : null;
    const search = (req.query.q || '').toString().slice(0, 120);
    const rows = await db.getAllRfqsForExport({ status, search });

    const columns = [
      'id', 'created_at', 'name', 'email', 'phone', 'company', 'product_category',
      'bore', 'stroke', 'pressure', 'tonnage', 'quantity', 'timeline',
      'application_details', 'budget_range', 'preferred_contact', 'best_time_to_call',
      'message', 'attachment_original_name', 'status', 'notes',
    ];
    const lines = [columns.join(',')];
    rows.forEach((row) => {
      lines.push(columns.map((col) => csvEscape(row[col])).join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rfq-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
});

// ---------- attachment download (staff-only; never served from /public) ----------

router.get('/api/rfq/:id/attachment', requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).render('404', { pageTitle: 'Not Found', metaDescription: '' });

    const lead = await db.getRfqById(id);
    if (!lead || !lead.attachment_filename) {
      return res.status(404).render('404', {
        pageTitle: 'Attachment Not Found | Admin',
        metaDescription: 'This RFQ has no attachment.',
      });
    }

    // attachment_filename is a server-generated random name (see routes/rfq.js),
    // never derived from user input, so this is safe from path traversal.
    const filePath = path.join(UPLOAD_DIR, lead.attachment_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).render('404', {
        pageTitle: 'Attachment Not Found | Admin',
        metaDescription: 'This file is no longer available.',
      });
    }

    res.setHeader('Content-Type', lead.attachment_mime || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${(lead.attachment_original_name || 'attachment').replace(/[^\w.\-]/g, '_')}"`
    );
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// ---------- JSON API (AJAX from the dashboard) ----------

// Bulk routes MUST be registered before the /:id routes below — otherwise
// Express matches "bulk" itself as the :id parameter (e.g. POST
// /api/rfq/bulk/status would match POST /api/rfq/:id/status with
// id="bulk" first, since routes are matched in registration order).

router.post('/api/rfq/bulk/status', requireAdminApi, async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid request.' });
    }
    const changed = await db.bulkUpdateStatus(ids, status);
    res.json({ success: true, changed });
  } catch (err) {
    next(err);
  }
});

router.post('/api/rfq/bulk/delete', requireAdminApi, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid request.' });
    }
    // Fetched before the DB delete, since once the rows are gone we'd have
    // no way to know which attachment files on disk belonged to them.
    const filenames = await db.getAttachmentFilenames(ids);
    const deleted = await db.bulkDelete(ids);
    filenames.forEach((filename) => fs.unlink(path.join(UPLOAD_DIR, filename), () => {}));
    res.json({ success: true, deleted });
  } catch (err) {
    next(err);
  }
});

router.post('/api/rfq/:id/status', requireAdminApi, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!Number.isInteger(id) || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid request.' });
    }
    const row = await db.updateRfqStatus(id, status);
    if (!row) return res.status(404).json({ success: false, message: 'Lead not found.' });
    res.json({ success: true, lead: row });
  } catch (err) {
    next(err);
  }
});

router.post('/api/rfq/:id/notes', requireAdminApi, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const notes = (req.body.notes || '').toString().slice(0, 4000);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request.' });
    }
    const row = await db.updateRfqNotes(id, notes);
    if (!row) return res.status(404).json({ success: false, message: 'Lead not found.' });
    res.json({ success: true, lead: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/api/rfq/:id', requireAdminApi, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ success: false, message: 'Invalid request.' });
    }
    const [filename] = await db.getAttachmentFilenames([id]);
    const deleted = await db.deleteRfq(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Lead not found.' });
    if (filename) fs.unlink(path.join(UPLOAD_DIR, filename), () => {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, requireAdmin };
