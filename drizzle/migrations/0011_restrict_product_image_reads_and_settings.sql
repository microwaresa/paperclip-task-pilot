DROP POLICY "Public reads product images" ON storage.objects;
CREATE POLICY "Owners read own product images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
ALTER POLICY "Anyone reads settings" ON public.store_settings USING (id = 1);