CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.grant_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'signup_as', '') = 'admin'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    PERFORM pg_advisory_xact_lock(hashtext('seen_first_admin'));
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $$;