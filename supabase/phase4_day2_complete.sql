-- Phase 4 Day 2: Complete Database Patch
-- Run this in Supabase SQL Editor to fix all "column not found" errors

-- 1. Ensure 'client_type' exists (Day 1 requirement)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'mobile';

-- 2. Ensure input tracking columns exist (Day 2 requirement)
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS molecule INT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS denominator INT;

-- 3. Force Schema Cache Reload (Critical for API to see new columns)
NOTIFY pgrst, 'reload config';
