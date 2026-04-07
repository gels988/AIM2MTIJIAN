-- Phase 3 Final: Private Donation & Economic Model
-- Record history of private donations (U to GAS exchange)

CREATE TABLE IF NOT EXISTS private_donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id),
  amount_u INT NOT NULL, -- Donation amount in U
  gas_granted INT NOT NULL, -- GAS granted based on exchange rate
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
