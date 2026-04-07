-- Phase 4 Day 2: Store Input Data for History Tracking
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS molecule INT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS denominator INT;

-- Refresh Schema Cache
NOTIFY pgrst, 'reload config';
