-- Fix RLS Policy for Predictions Insert
-- The default RLS policy might be blocking INSERTs for the test user
-- Let's create a policy that allows authenticated users to INSERT their own rows

DROP POLICY IF EXISTS "Users can insert their own predictions" ON predictions;
CREATE POLICY "Users can insert their own predictions" ON predictions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also ensure SELECT is allowed (for verification)
DROP POLICY IF EXISTS "Users can see their own predictions" ON predictions;
CREATE POLICY "Users can see their own predictions" ON predictions
    FOR SELECT USING (auth.uid() = user_id);

-- Also ensure UPDATE is allowed (for feedback)
DROP POLICY IF EXISTS "Users can update their own predictions" ON predictions;
CREATE POLICY "Users can update their own predictions" ON predictions
    FOR UPDATE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload config';
