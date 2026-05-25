INSERT INTO product_variants (id, variant_name, sku, price, stock_quantity, discount_percentage, discount_amount, is_active, created_at, updated_at, qr_code, is_focused_product, focused_target_quantity, focused_territories, hsn_code, product_id) VALUES
('0bc4a82f-4ef1-4ae6-b8af-a413470a3fdf','ADUKU 250G','Adu250',342.86,0,0,0,true,'2025-11-15 06:05:45.875213+00','2026-05-15 11:44:59.942756+00','variant:Adu250:ADUKU 250G',false,0,ARRAY[]::text[],'90230','7f9e8802-1a63-4fbf-afa2-096210e82745'),
('214f989c-3f6c-4f4e-9576-575d746834b0','ELACHI 250G','Ela250',314.29,0,0,0,true,'2025-11-15 06:05:47.911923+00','2026-05-15 11:44:59.942756+00','variant:Ela250:ELACHI 250G',false,0,ARRAY[]::text[],'90230','b7fbd116-e797-477c-af35-d9c1a07af2ac'),
('9465d743-501a-4871-9d41-6cc248cfe211','DAKSHIN 250G','Dak250',209.52,0,0,0,true,'2025-11-15 06:05:46.299092+00','2026-05-15 11:44:59.942756+00','variant:Dak250:DAKSHIN 250G',false,0,ARRAY[]::text[],'90230','b26b2c73-ff95-4e1c-972f-d028f1afb217'),
('53b8017d-955d-4bb9-899b-01b045baaffb','VAYU 250','vay250',209.52,0,0,0,true,'2026-05-15 11:57:11.065804+00','2026-05-15 11:57:11.065804+00','variant:vay250:VAYU 250',false,0,ARRAY[]::text[],NULL,'2f5fc10b-8ef2-4511-a532-eb90aeefbf1c'),
('6db0d8e3-dce3-4fca-88a4-cae6236ded09','BLUE 100G','Blue100',333.33,0,0,0,true,'2025-11-15 06:05:47.522743+00','2026-05-15 11:44:59.942756+00','variant:Blue100:BLUE 100G',false,0,ARRAY[]::text[],'90230','44aec890-ab0b-497a-98d7-9059e1f30c3f')
ON CONFLICT (id) DO NOTHING;

-- Backfill order_items.product_id for restored Mokshith line items
UPDATE order_items oi
SET product_id = p.id,
    hsn_code = COALESCE(oi.hsn_code, p.hsn_code, '90230')
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE oi.product_id IS NULL
  AND lower(trim(oi.product_name)) = lower(trim(pv.variant_name));