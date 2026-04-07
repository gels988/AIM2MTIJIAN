-- Phase 3 Fix: Add Missing Transfer Logic & Fix Constraints
-- Run this in Supabase SQL Editor

-- 1. Ensure Transfers Table Exists
CREATE TABLE IF NOT EXISTS point_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user UUID REFERENCES app_users(id),
  to_user UUID REFERENCES app_users(id),
  amount INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Atomic Transfer Function (Missing in previous script)
CREATE OR REPLACE FUNCTION transfer_points(
  sender_id UUID,
  receiver_id UUID,
  amount INT
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_balance INT;
BEGIN
  -- Check Balance
  SELECT balance_g INTO sender_balance
  FROM app_users WHERE id = sender_id;
  
  IF sender_balance IS NULL OR sender_balance < amount THEN
    RETURN FALSE;
  END IF;

  -- Atomic Transfer
  UPDATE app_users SET balance_g = balance_g - amount WHERE id = sender_id;
  UPDATE app_users SET balance_g = balance_g + amount WHERE id = receiver_id;

  -- Log
  INSERT INTO point_transfers (from_user, to_user, amount)
  VALUES (sender_id, receiver_id, amount);

  RETURN TRUE;
END;
$$;

-- 3. Fix Phone Number Constraint (Make Optional for Email-only users)
ALTER TABLE app_users ALTER COLUMN phone_number DROP NOT NULL;
