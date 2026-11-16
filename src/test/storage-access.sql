-- Integration regression: run with psql against a database containing product photos.
-- All role/session changes are transaction-local and rolled back.
BEGIN;
SELECT set_config('test.photo_owner', split_part(name, '/', 1), true)
FROM storage.objects WHERE bucket_id = 'product-images' LIMIT 1;
DO $$ BEGIN
  IF current_setting('test.photo_owner', true) IS NULL THEN
    RAISE EXCEPTION 'Photo fixture required to verify owner access';
  END IF;
END $$;

SET LOCAL ROLE anon;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'product-images') THEN
    RAISE EXCEPTION 'Anonymous callers must not enumerate product photo files';
  END IF;
  IF EXISTS (SELECT 1 FROM public.store_settings WHERE id <> 1) OR
     NOT EXISTS (SELECT 1 FROM public.store_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'Public settings must expose only the active shop record';
  END IF;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'product-images') THEN
    RAISE EXCEPTION 'Unrelated users must not read other owners photo files';
  END IF;
END $$;

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', current_setting('test.photo_owner'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'product-images') THEN
    RAISE EXCEPTION 'Owners must be able to read and sign their own photo files';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'product-images'
    AND split_part(name, '/', 1) <> auth.uid()::text) THEN
    RAISE EXCEPTION 'Owner access must stay confined to the caller folder';
  END IF;
END $$;
ROLLBACK;