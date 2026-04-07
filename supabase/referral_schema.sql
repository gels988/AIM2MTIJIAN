-- 扩展用户表
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS balance_g INT DEFAULT 300, 
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(16) UNIQUE;

-- 创建转账日志表
CREATE TABLE IF NOT EXISTS point_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user UUID REFERENCES app_users(id),
  to_user UUID REFERENCES app_users(id),
  amount INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_transfers_from ON point_transfers(from_user);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON point_transfers(to_user);
