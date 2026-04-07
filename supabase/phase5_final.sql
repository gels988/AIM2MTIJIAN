-- Phase 5.1 Final: Input Format & Display Enhancement
ALTER TABLE predictions 
  ADD COLUMN IF NOT EXISTS raw_input TEXT,        -- e.g., '123/303'
  ADD COLUMN IF NOT EXISTS mol_str TEXT,          -- e.g., '123'
  ADD COLUMN IF NOT EXISTS den_str TEXT,          -- e.g., '303'
  ADD COLUMN IF NOT EXISTS mol_digits JSON,       -- e.g., [1,2,3]
  ADD COLUMN IF NOT EXISTS den_digits JSON;       -- e.g., [3,0,3]

-- Ensure PostgREST reloads schema
NOTIFY pgrst, 'reload config';