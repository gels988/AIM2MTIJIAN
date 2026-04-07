-- Phase 2: Early Adopter & Terminology Support

-- 1. Add Early Adopter Flag and Private Donation Tracker
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS is_early_adopter BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS private_donation DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE; -- Ensure email column exists and is unique

-- 2. Terminology Updates (Comments/Metadata only, logic remains in code)
-- balance_g now represents "GAS"
-- referral_code represents "Island Code"

-- 3. Update Early Adopters (Example Logic)
-- Trigger or periodic job would run this, but for now we define the update query
-- UPDATE app_users 
-- SET balance_g = 15000, is_early_adopter = TRUE 
-- WHERE private_donation >= 5000 AND is_early_adopter = FALSE;
