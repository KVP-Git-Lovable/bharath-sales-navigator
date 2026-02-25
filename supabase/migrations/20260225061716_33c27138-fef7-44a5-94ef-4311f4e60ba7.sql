
-- Set 12 annual opening leave balance for all active users for 2026
-- For Casual Leave, Sick Leave, and Emergency Leave (excluding Loss of Pay)
INSERT INTO leave_balance (user_id, leave_type_id, year, opening_balance, used_balance)
SELECT p.id, lt.id, 2026, 12, 0
FROM profiles p
CROSS JOIN leave_types lt
WHERE p.user_status = 'active'
  AND lt.name != 'Loss of Pay'
ON CONFLICT (user_id, leave_type_id, year)
DO UPDATE SET 
  opening_balance = 12,
  updated_at = now();
