-- Phase 5.1: Database Schema for Raw Inputs and Special Markers
-- 1. Add columns for raw strings and parsed sums
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS raw_input VARCHAR(50);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS mol_str VARCHAR(10);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS den_str VARCHAR(10);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS mol_sum INT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS den_sum INT;

-- 2. Add columns for special markers (for analytics)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_player_pair BOOLEAN DEFAULT FALSE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_banker_pair BOOLEAN DEFAULT FALSE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_player_7 BOOLEAN DEFAULT FALSE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_player_8 BOOLEAN DEFAULT FALSE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_banker_6 BOOLEAN DEFAULT FALSE;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_crown BOOLEAN DEFAULT FALSE;

-- 3. Force Schema Cache Reload
NOTIFY pgrst, 'reload config';
