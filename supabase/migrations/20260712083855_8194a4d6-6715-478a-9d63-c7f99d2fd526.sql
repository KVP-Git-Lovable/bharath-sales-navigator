
DROP POLICY IF EXISTS "support_att_insert_own" ON storage.objects;
CREATE POLICY "support_att_insert_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "support_att_read_own_or_admin" ON storage.objects;
CREATE POLICY "support_att_read_own_or_admin" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'support-attachments' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_system_admin(auth.uid())));

DROP POLICY IF EXISTS "support_att_delete_own_or_admin" ON storage.objects;
CREATE POLICY "support_att_delete_own_or_admin" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'support-attachments' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_system_admin(auth.uid())));
