-- Phase 3 Final Deployment Script (Updated for Phase A Isolation)
-- Run this in Supabase SQL Editor to enable all features and security.

-- 1. Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Schema Updates (Add/Ensure Columns)
DO $$
BEGIN
    -- Add 'donated_count' to app_users (for Dynamic Donation logic)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'donated_count') THEN
        ALTER TABLE app_users ADD COLUMN donated_count INT DEFAULT 0;
    END IF;

    -- Add 'email' to app_users (if missing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'email') THEN
        ALTER TABLE app_users ADD COLUMN email TEXT;
    END IF;

    -- Ensure 'balance_g' exists and defaults to 0
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'balance_g') THEN
        ALTER TABLE app_users ADD COLUMN balance_g INT DEFAULT 0;
    END IF;
END $$;

-- 3. Create 'private_donations' table (if not exists)
CREATE TABLE IF NOT EXISTS private_donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id),
  amount_u INT NOT NULL, -- Donation amount in U
  gas_granted INT NOT NULL, -- GAS granted based on exchange rate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CLEANUP: Remove Blockchain Residue (Phase A Requirement)
DO $$
BEGIN
    -- Remove wallet_address if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'wallet_address') THEN
        ALTER TABLE app_users DROP COLUMN wallet_address;
    END IF;

    -- Remove tx_hash if exists (from donations or users)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'private_donations' AND column_name = 'tx_hash') THEN
        ALTER TABLE private_donations DROP COLUMN tx_hash;
    END IF;
    
    -- Remove G-Coin balance if exists (we use balance_g only)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'g_coin_balance') THEN
        ALTER TABLE app_users DROP COLUMN g_coin_balance;
    END IF;
END $$;

-- 5. SECURITY: Row Level Security (RLS)
-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_donations ENABLE ROW LEVEL SECURITY;

-- Policy: User can only see their own data
DROP POLICY IF EXISTS user_own_data ON app_users;
CREATE POLICY user_own_data ON app_users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: User can only see their own donations
DROP POLICY IF EXISTS user_own_donations ON private_donations;
CREATE POLICY user_own_donations ON private_donations
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Service Role (Admin) has full access (Supabase default, but good to be explicit if needed, 
-- though service_role bypasses RLS automatically).

-- 6. RPC: Secure Private Donation (SECURITY DEFINER)
-- Allows 'anon' users to donate (update balance) without direct table UPDATE permissions.
CREATE OR REPLACE FUNCTION process_private_donation(
    p_user_id UUID, 
    p_amount_u INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
AS $$
DECLARE
    v_gas_granted INT;
    v_new_balance INT;
BEGIN
    -- Calculate GAS Reward (Logic mirrored from server.js for DB consistency)
    -- 1-200 -> 2.2x
    -- 201-1999 -> 2.6x
    -- 2000-5000 -> 2.8x
    -- 5001+ -> 3.0x
    IF p_amount_u <= 200 THEN
        v_gas_granted := FLOOR(p_amount_u * 2.2);
    ELSIF p_amount_u <= 1999 THEN
        v_gas_granted := FLOOR(p_amount_u * 2.6);
    ELSIF p_amount_u <= 5000 THEN
        v_gas_granted := FLOOR(p_amount_u * 2.8);
    ELSE
        v_gas_granted := FLOOR(p_amount_u * 3.0);
    END IF;

    -- Update User Balance
    UPDATE app_users
    SET balance_g = balance_g + v_gas_granted
    WHERE id = p_user_id
    RETURNING balance_g INTO v_new_balance;

    -- Record Donation
    INSERT INTO private_donations (user_id, amount_u, gas_granted)
    VALUES (p_user_id, p_amount_u, v_gas_granted);

    -- Return Result
    RETURN jsonb_build_object(
        'success', true,
        'gas_granted', v_gas_granted,
        'new_balance', v_new_balance
    );
END;
$$;
