-- Phase 4: Fix Schema Cache for Client Type Column
-- Execute this if you see "Could not find the 'client_type' column" error

NOTIFY pgrst, 'reload config';

-- Verification (Optional)
SELECT count(*) FROM predictions WHERE client_type IS NOT NULL;