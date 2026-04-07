-- Phase 3: Dynamic Donation Logic
-- Track how many donations an island owner has made to calculate dynamic GAS amount.

ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS donated_count INT DEFAULT 0;
