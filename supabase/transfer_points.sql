-- 原子转账存储过程
CREATE OR REPLACE FUNCTION transfer_points(
  sender_id UUID,
  receiver_id UUID,
  amount INT
) RETURNS BOOLEAN AS $$
DECLARE
  sender_balance INT;
BEGIN
  -- 检查发送方余额
  SELECT balance_g INTO sender_balance
  FROM app_users WHERE id = sender_id;
  
  IF sender_balance IS NULL OR sender_balance < amount THEN
    RETURN FALSE;
  END IF;

  -- 检查最小余额（保留100分）
  IF sender_balance - amount < 100 THEN
    RETURN FALSE;
  END IF;

  -- 原子转账
  UPDATE app_users SET balance_g = balance_g - amount WHERE id = sender_id;
  UPDATE app_users SET balance_g = balance_g + amount WHERE id = receiver_id;

  -- 记录日志
  INSERT INTO point_transfers (from_user, to_user, amount)
  VALUES (sender_id, receiver_id, amount);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
