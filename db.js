// db.js — single shared Postgres connection pool (Neon-hosted), with
// retry-on-cold-start handling and full CRUD for RFQ leads.
//
// Neon requires SSL. Neon's certificate chain validates fine in Node's
// default trust store on recent Node versions, but some hosts (older
// containers, some PaaS images) don't ship the full chain — so we accept
// `rejectUnauthorized: false` the same way Neon's own docs recommend for
// the `pg` driver. This still encrypts the connection; it just skips
// strict CA verification.
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn(
    '[db] DATABASE_URL is not set. Copy .env.example to .env and add your ' +
    'Neon connection string before starting the server.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Guards against a single slow/hung query holding a connection forever
  // (e.g. a network blip mid-query against a serverless Postgres branch).
  statement_timeout: 15000,
  query_timeout: 15000,
});

pool.on('error', (err) => {
  // Idle client errors (e.g. Neon closing a connection at rest, or a
  // serverless branch suspending) should never crash the process — the
  // pool will open a fresh connection on the next query.
  console.error('[db] Unexpected error on idle client:', err.message);
});

// ---------------------------------------------------------------------
// Self-healing schema: creates the table on first run even if
// `npm run migrate` was never executed against this database, and adds
// any columns introduced after a database was first created (e.g.
// `notes`, added for the admin CRM upgrade) via ADD COLUMN IF NOT
// EXISTS, so existing installs pick it up automatically too.
// ---------------------------------------------------------------------
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS rfq_requests (
    id                SERIAL PRIMARY KEY,
    name              TEXT NOT NULL,
    email             TEXT NOT NULL,
    phone             TEXT NOT NULL,
    company           TEXT,
    product_category  TEXT NOT NULL,
    bore              TEXT,
    stroke            TEXT,
    pressure          TEXT,
    tonnage           TEXT,
    message           TEXT,
    status            TEXT NOT NULL DEFAULT 'new',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_rfq_requests_created_at ON rfq_requests (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_rfq_requests_status ON rfq_requests (status);
  ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
`;

// Cached so concurrent requests during a cold start don't all race to
// create the table at once; a failed attempt clears the cache so the
// next call tries again instead of remembering a permanent failure.
let schemaReadyPromise = null;

async function ensureSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = pool.query(SCHEMA_SQL)
      .then(() => {
        console.log('[db] Schema verified — rfq_requests table is ready.');
        return true;
      })
      .catch((err) => {
        schemaReadyPromise = null;
        console.error('[db] Failed to create/verify schema:', err.message);
        throw err;
      });
  }
  return schemaReadyPromise;
}

function isMissingTableError(err) {
  return err.code === '42P01'; // Postgres: undefined_table
}

function isMissingColumnError(err) {
  return err.code === '42703'; // Postgres: undefined_column
}

function isTransientError(err) {
  // Neon (and Postgres generally) surface cold-starts / connection drops
  // through these codes/messages. Retrying once after a short pause turns
  // a would-be user-facing failure into a normal, slightly slower request.
  const transientCodes = new Set(['57P01', '57P03', 'ECONNRESET', 'ETIMEDOUT']);
  return (
    transientCodes.has(err.code) ||
    /connection.*(closed|terminated|reset)/i.test(err.message || '')
  );
}

/**
 * Run a query with one automatic retry if the first attempt fails for a
 * transient connection reason (cold start, dropped connection, etc.) —
 * or, if the table/column doesn't exist yet, create/add it and retry once.
 */
async function withRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (isMissingTableError(err) || isMissingColumnError(err)) {
      console.warn('[db] Schema out of date (missing table/column) — fixing and retrying:', err.message);
      schemaReadyPromise = null;
      await ensureSchema();
      return fn();
    }
    if (isTransientError(err)) {
      console.warn('[db] Transient error, retrying once:', err.message);
      await new Promise((resolve) => setTimeout(resolve, 400));
      return fn();
    }
    throw err;
  }
}

async function query(text, params) {
  return withRetry(() => pool.query(text, params));
}

/**
 * Lightweight connectivity check for /healthz and startup diagnostics.
 * Also ensures the schema exists, so a health check (which most hosting
 * platforms poll right after deploy) doubles as the trigger that creates
 * the table on a brand-new database. Resolves { ok: true, latencyMs } or
 * { ok: false, error }.
 */
async function checkHealth() {
  const start = Date.now();
  try {
    await withRetry(() => pool.query('SELECT 1'));
    await ensureSchema();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Insert a Request-for-Quote submission.
 * Returns the inserted row (including generated id + created_at).
 */
async function insertRfq({
  name, email, phone, company, productCategory,
  bore, stroke, pressure, tonnage, message,
}) {
  const sql = `
    INSERT INTO rfq_requests
      (name, email, phone, company, product_category,
       bore, stroke, pressure, tonnage, message)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id, created_at
  `;
  const values = [name, email, phone, company, productCategory,
    bore, stroke, pressure, tonnage, message];
  return withRetry(async () => {
    const { rows } = await pool.query(sql, values);
    return rows[0];
  });
}

/**
 * Build a shared WHERE clause + params for status filter and free-text
 * search across name/email/phone/company. Used by both getAllRfqs (paged)
 * and exportRfqsCsv (unpaged) so the two stay in sync.
 */
function buildFilter({ status, search }) {
  const params = [];
  const clauses = [];
  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    const idx = params.length;
    clauses.push(
      `(name ILIKE $${idx} OR email ILIKE $${idx} OR phone ILIKE $${idx} OR company ILIKE $${idx})`
    );
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
}

/**
 * List RFQ leads, optionally filtered by status and/or a free-text search
 * (name, email, phone, company), sortable, with offset pagination for the
 * admin dashboard.
 */
const SORTABLE_COLUMNS = {
  created_at: 'created_at',
  name: 'name',
  status: 'status',
  product_category: 'product_category',
};

async function getAllRfqs({
  status = null, search = null, limit = 25, offset = 0,
  sort = 'created_at', dir = 'desc',
} = {}) {
  return withRetry(async () => {
    const { where, params } = buildFilter({ status, search });
    const sortCol = SORTABLE_COLUMNS[sort] || 'created_at';
    const sortDir = dir === 'asc' ? 'ASC' : 'DESC';

    const listParams = [...params, limit, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const { rows } = await pool.query(
      `SELECT * FROM rfq_requests ${where}
       ORDER BY ${sortCol} ${sortDir}, id ${sortDir}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM rfq_requests ${where}`,
      params
    );
    return { rows, total: countRows[0].total };
  });
}

/**
 * Same filter as getAllRfqs but unpaged — for CSV export.
 */
async function getAllRfqsForExport({ status = null, search = null } = {}) {
  return withRetry(async () => {
    const { where, params } = buildFilter({ status, search });
    const { rows } = await pool.query(
      `SELECT * FROM rfq_requests ${where} ORDER BY created_at DESC`,
      params
    );
    return rows;
  });
}

async function getRfqById(id) {
  return withRetry(async () => {
    const { rows } = await pool.query('SELECT * FROM rfq_requests WHERE id = $1', [id]);
    return rows[0] || null;
  });
}

const VALID_STATUSES = new Set(['new', 'contacted', 'quoted', 'closed']);

async function updateRfqStatus(id, status) {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  return withRetry(async () => {
    const { rows } = await pool.query(
      'UPDATE rfq_requests SET status = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0] || null;
  });
}

/**
 * Bulk status update — used by the dashboard's multi-select action bar.
 * Returns the number of rows actually changed.
 */
async function bulkUpdateStatus(ids, status) {
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const cleanIds = ids.map((id) => parseInt(id, 10)).filter(Number.isInteger);
  if (cleanIds.length === 0) return 0;
  return withRetry(async () => {
    const { rowCount } = await pool.query(
      'UPDATE rfq_requests SET status = $1, updated_at = now() WHERE id = ANY($2::int[])',
      [status, cleanIds]
    );
    return rowCount;
  });
}

async function bulkDelete(ids) {
  const cleanIds = ids.map((id) => parseInt(id, 10)).filter(Number.isInteger);
  if (cleanIds.length === 0) return 0;
  return withRetry(async () => {
    const { rowCount } = await pool.query(
      'DELETE FROM rfq_requests WHERE id = ANY($1::int[])',
      [cleanIds]
    );
    return rowCount;
  });
}

async function updateRfqNotes(id, notes) {
  return withRetry(async () => {
    const { rows } = await pool.query(
      'UPDATE rfq_requests SET notes = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [notes, id]
    );
    return rows[0] || null;
  });
}

async function deleteRfq(id) {
  return withRetry(async () => {
    const { rowCount } = await pool.query('DELETE FROM rfq_requests WHERE id = $1', [id]);
    return rowCount > 0;
  });
}

/**
 * Counts per status, for the admin dashboard summary strip.
 */
async function getRfqStatusCounts() {
  return withRetry(async () => {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM rfq_requests GROUP BY status`
    );
    const counts = { new: 0, contacted: 0, quoted: 0, closed: 0 };
    rows.forEach((r) => { counts[r.status] = r.count; });
    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
    return counts;
  });
}

/**
 * Counts per product category, for the dashboard's demand-mix chart.
 */
async function getRfqCategoryCounts() {
  return withRetry(async () => {
    const { rows } = await pool.query(
      `SELECT product_category, COUNT(*)::int AS count
       FROM rfq_requests GROUP BY product_category ORDER BY count DESC`
    );
    return rows;
  });
}

/**
 * Leads received per day for the last N days — powers the small trend
 * sparkline on the admin dashboard.
 */
async function getRfqDailyCounts(days = 14) {
  return withRetry(async () => {
    const { rows } = await pool.query(
      `SELECT to_char(d::date, 'YYYY-MM-DD') AS day,
              COALESCE(COUNT(r.id), 0)::int AS count
       FROM generate_series(CURRENT_DATE - ($1::int - 1), CURRENT_DATE, interval '1 day') d
       LEFT JOIN rfq_requests r ON r.created_at::date = d::date
       GROUP BY d
       ORDER BY d`,
      [days]
    );
    return rows;
  });
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  checkHealth,
  ensureSchema,
  insertRfq,
  getAllRfqs,
  getAllRfqsForExport,
  getRfqById,
  updateRfqStatus,
  updateRfqNotes,
  bulkUpdateStatus,
  bulkDelete,
  deleteRfq,
  getRfqStatusCounts,
  getRfqCategoryCounts,
  getRfqDailyCounts,
  closePool,
};
