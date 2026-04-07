-- Phase 4: Prediction Logic & Accuracy Tracking

-- 1. Create Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id),
  predicted_color VARCHAR(10) NOT NULL, -- 'red', 'blue', 'green'
  s_value FLOAT NOT NULL,
  model_a FLOAT,
  model_b FLOAT,
  model_c FLOAT,
  actual_result VARCHAR(10), -- Updated after user feedback
  client_type VARCHAR(20) DEFAULT 'mobile', -- 'mobile' or 'desktop'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own predictions
DROP POLICY IF EXISTS user_own_predictions ON predictions;
CREATE POLICY user_own_predictions ON predictions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own prediction's actual_result
DROP POLICY IF EXISTS user_update_own_prediction ON predictions;
CREATE POLICY user_update_own_prediction ON predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Service Role can do anything (Implicit, but ensures API works)

-- 3. Create Accuracy View
CREATE OR REPLACE VIEW accuracy_by_s_zone AS
SELECT
  CASE
    WHEN s_value >= 0.7 THEN 'Strong Red'
    WHEN s_value <= 0.3 THEN 'Strong Blue'
    ELSE 'Balanced'
  END AS zone,
  AVG(CASE WHEN predicted_color = actual_result THEN 1 ELSE 0 END) AS accuracy,
  COUNT(*) AS sample_size
FROM predictions
WHERE actual_result IS NOT NULL
GROUP BY zone;
