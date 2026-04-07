-- Ensure Test User Exists for Verification
-- The verify_phase4.js script now uses this UUID
INSERT INTO app_users (id, email, balance_g)
VALUES ('00000000-0000-0000-0000-000000000000', 'test_bypass@mayiju.com', 9999)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload config';
