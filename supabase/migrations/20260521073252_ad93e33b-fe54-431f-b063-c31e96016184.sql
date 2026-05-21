ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rate numeric NOT NULL DEFAULT 0;

UPDATE public.products AS p SET rate = v.rate, updated_at = now()
FROM (VALUES
  ('2f5fc10b-8ef2-4511-a532-eb90aeefbf1c'::uuid, 228.57),
  ('44aec890-ab0b-497a-98d7-9059e1f30c3f'::uuid, 342.86),
  ('5f8a033b-1861-4209-b438-27c9c774bd2f'::uuid, 361.90),
  ('6dbf027a-0821-46d2-a707-f220d342be38'::uuid, 295.24),
  ('73fa608c-2296-4977-a4f3-603502fdf103'::uuid, 209.52),
  ('7b9cf8c9-249c-4708-8f3c-8cea48faad4c'::uuid, 333.33),
  ('7f9e8802-1a63-4fbf-afa2-096210e82745'::uuid, 361.90),
  ('b26b2c73-ff95-4e1c-972f-d028f1afb217'::uuid, 228.57),
  ('b7fbd116-e797-477c-af35-d9c1a07af2ac'::uuid, 333.33),
  ('ccf9a08b-f7e1-4f2e-9fb2-c31fb35c4029'::uuid, 342.86),
  ('f69e969b-720d-4090-a4b6-384a07087170'::uuid, 333.33)
) AS v(id, rate)
WHERE p.id = v.id;