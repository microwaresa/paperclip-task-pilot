CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE,
  code text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('percent','fixed','free_shipping')),
  value integer NOT NULL DEFAULT 0 CHECK (value >= 0),
  min_order integer NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX coupons_code_key ON public.coupons (upper(code));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Seller manages own coupons" ON public.coupons FOR ALL TO authenticated
  USING (merchant_id IS NOT NULL AND public.owns_merchant(merchant_id))
  WITH CHECK (merchant_id IS NOT NULL AND public.owns_merchant(merchant_id));

CREATE OR REPLACE FUNCTION public.guard_coupon_count() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN NEW.used_count := 0; ELSE NEW.used_count := OLD.used_count; END IF;
  END IF;
  NEW.code := upper(trim(NEW.code));
  IF NEW.kind = 'percent' AND NEW.value > 100 THEN RAISE EXCEPTION 'percent must be <= 100'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER coupons_guard BEFORE INSERT OR UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.guard_coupon_count();

CREATE OR REPLACE FUNCTION public.use_coupon(_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.coupons SET used_count = used_count + 1
   WHERE id = _id AND active AND (expires_at IS NULL OR expires_at > now())
     AND (max_uses IS NULL OR used_count < max_uses);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
REVOKE EXECUTE ON FUNCTION public.use_coupon(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_coupon(uuid) TO service_role;

ALTER TABLE public.merchant_products ADD COLUMN sale_price integer CHECK (sale_price IS NULL OR sale_price > 0);
ALTER TABLE public.merchant_products ADD COLUMN sale_ends_at timestamptz;
ALTER TABLE public.orders ADD COLUMN discount integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN coupon_code text;
ALTER TABLE public.order_items ADD COLUMN discount integer NOT NULL DEFAULT 0;