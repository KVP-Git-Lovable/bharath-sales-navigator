-- Create visits for orders that don't have corresponding visit records
-- This fixes the issue where offline orders synced without creating visits

INSERT INTO public.visits (retailer_id, user_id, planned_date, status, check_out_time, created_at, updated_at)
SELECT DISTINCT 
  o.retailer_id,
  o.user_id,
  DATE(o.created_at) as planned_date,
  'productive' as status,
  o.created_at as check_out_time,
  o.created_at as created_at,
  NOW() as updated_at
FROM orders o
LEFT JOIN visits v ON o.retailer_id = v.retailer_id 
  AND DATE(o.created_at) = v.planned_date
  AND o.user_id = v.user_id
WHERE v.id IS NULL 
  AND o.status = 'confirmed'
  AND o.created_at >= '2025-12-01';