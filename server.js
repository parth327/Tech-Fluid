require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const db = require('./db');
const pagesRouter = require('./routes/pages');
const rfqRouter = require('./routes/rfq');
const { router: adminRouter } = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- view engine ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // needed for correct rate-limit IPs & secure cookies behind Render/Railway/etc.

// ---------- health check (checks real DB connectivity, not just "process is up") ----------
app.get('/healthz', async (req, res) => {
  const dbHealth = await db.checkHealth();
  const status = dbHealth.ok ? 200 : 503;
  res.status(status).json({
    ok: dbHealth.ok,
    db: dbHealth.ok ? { latencyMs: dbHealth.latencyMs } : { error: dbHealth.error },
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// ---------- security & perf middleware ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Google Fonts + the footer's Google Maps embed are the only
        // third-party origins this site talks to.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        frameSrc: ["'self'", 'https://www.google.com'],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(compression());

// ---------- body parsing ----------
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// ---------- static assets ----------
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
}));

// ---------- locals available to every view ----------
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.company = {
    name: 'Tech Fluid Industries',
    phone: process.env.COMPANY_PHONE || '+91 79 XXXX XXXX',
    whatsapp: process.env.COMPANY_WHATSAPP || process.env.COMPANY_PHONE || '',
    email: process.env.COMPANY_EMAIL || 'info@techfluidindustries.com',
    address: process.env.COMPANY_ADDRESS ||
      '32, Victoria Industrial Park, Kathwada GIDC, Ahmedabad, Gujarat, India',
    foundedYear: 2009,
  };
  next();
});

// ---------- routes ----------
app.use('/', pagesRouter);
app.use('/api/rfq', rfqRouter);
app.use('/admin', adminRouter);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).render('404', {
    pageTitle: 'Page Not Found | Tech Fluid Industries',
    metaDescription: 'The page you are looking for could not be found.',
  });
});

// ---------- error handler ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).render('500', {
    pageTitle: 'Something Went Wrong | Tech Fluid Industries',
    metaDescription: 'An unexpected error occurred.',
  });
});

const server = app.listen(PORT, () => {
  console.log(`Tech Fluid Industries site running on http://localhost:${PORT}`);

  // Create the rfq_requests table on first boot if it doesn't exist yet
  // (e.g. a fresh Neon database that never had `npm run migrate` run
  // against it). This runs in the background — the server still starts
  // and serves pages immediately even if the database is briefly
  // unreachable; db.js will also retry this automatically the moment an
  // actual RFQ is submitted, so no request ever fails just because this
  // startup check hasn't finished yet.
  db.ensureSchema().catch((err) => {
    console.error(
      '[server] Could not verify/create the database schema at startup ' +
      '(will retry automatically on the next database request):', err.message
    );
  });
});

// ---------- graceful shutdown ----------
// Deployment platforms (Render, Railway, Docker, etc.) send SIGTERM before
// killing the process. Without this, in-flight requests and DB queries can
// be cut off mid-write. Give everything a few seconds to finish cleanly.
function shutdown(signal) {
  console.log(`[server] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    try {
      await db.closePool();
    } catch (err) {
      console.error('[server] Error closing DB pool:', err.message);
    }
    process.exit(0);
  });
  // Force-exit if something hangs longer than this.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
