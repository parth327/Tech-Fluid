-- 001_init.sql
-- Run once against your Neon database (see README.md > "Set up the database").

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
  status            TEXT NOT NULL DEFAULT 'new',   -- new | contacted | quoted | closed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfq_requests_created_at ON rfq_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_status ON rfq_requests (status);
