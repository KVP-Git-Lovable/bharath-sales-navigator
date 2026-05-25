UPDATE order_items
SET product_id = '2f5fc10b-8ef2-4511-a532-eb90aeefbf1c',
    hsn_code = COALESCE(hsn_code, '90230')
WHERE product_id IS NULL
  AND product_name = 'VAYU 250G'
  AND order_id IN ('fd2e5abd-89bc-4582-a7de-203b901e876a','32c8bf36-1817-4d45-a92f-dacf0b4da52f');