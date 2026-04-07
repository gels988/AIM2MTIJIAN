-- Phase 5.2: SCI Index Support
-- Add sci_index column to predictions table

ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS sci_index INTEGER;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';
