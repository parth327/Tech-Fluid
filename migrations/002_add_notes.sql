-- 002_add_notes.sql
-- Adds internal notes + an updated_at timestamp to RFQ leads, for the
-- admin CRM upgrade. Safe to re-run.

ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
