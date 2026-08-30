-- 003_add_rfq_fields.sql
-- Adds quantity, timeline, application detail, budget, preferred-contact
-- and drawing-attachment fields to RFQ leads. Safe to re-run.

ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS quantity TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS timeline TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS application_details TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS preferred_contact TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS best_time_to_call TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS attachment_filename TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS attachment_original_name TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS attachment_mime TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS attachment_size INTEGER;
