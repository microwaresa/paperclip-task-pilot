CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  store_name text NOT NULL CHECK (char_length(store_name) BETWEEN 2 AND 60),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,40}$'),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merchants TO anon;
GRANT SELECT, INSERT, UPDATE ON public.merchants TO authenticated;
GRANT ALL ON public.merchants TO service_role;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public sees approved merchants" ON public.merchants FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Owner sees own merchant" ON public.merchants FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin sees merchants" ON public.merchants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users apply as merchant" ON public.merchants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Owner edits own merchant" ON public.merchants FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin edits merchants" ON public.merchants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.guard_merchant_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'only admin can change merchant status';
  END IF;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER merchants_guard_status BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.guard_merchant_status();

CREATE OR REPLACE FUNCTION public.owns_merchant(_merchant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.merchants WHERE id = _merchant_id AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.merchant_is_approved(_merchant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.merchants WHERE id = _merchant_id AND status = 'approved')
$$;

CREATE TABLE public.merchant_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 150),
  brand text NOT NULL DEFAULT '' CHECK (char_length(brand) <= 60),
  category text NOT NULL,
  price integer NOT NULL CHECK (price > 0 AND price <= 1000000),
  old_price integer CHECK (old_price IS NULL OR old_price >= price),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  image_url text,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX merchant_products_merchant_idx ON public.merchant_products(merchant_id);
GRANT SELECT ON public.merchant_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_products TO authenticated;
GRANT ALL ON public.merchant_products TO service_role;
ALTER TABLE public.merchant_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public sees live products" ON public.merchant_products FOR SELECT TO anon, authenticated USING (active AND public.merchant_is_approved(merchant_id));
CREATE POLICY "Owner sees own products" ON public.merchant_products FOR SELECT TO authenticated USING (public.owns_merchant(merchant_id));
CREATE POLICY "Admin sees products" ON public.merchant_products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner adds products" ON public.merchant_products FOR INSERT TO authenticated WITH CHECK (public.owns_merchant(merchant_id));
CREATE POLICY "Owner edits products" ON public.merchant_products FOR UPDATE TO authenticated USING (public.owns_merchant(merchant_id)) WITH CHECK (public.owns_merchant(merchant_id));
CREATE POLICY "Owner deletes products" ON public.merchant_products FOR DELETE TO authenticated USING (public.owns_merchant(merchant_id));

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE SET NULL,
  product_id text NOT NULL,
  name text NOT NULL,
  price integer NOT NULL,
  qty integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','shipped','delivered','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
CREATE INDEX order_items_merchant_idx ON public.order_items(merchant_id);
GRANT SELECT ON public.order_items TO authenticated;
GRANT UPDATE (status) ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_order(_order_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND user_id = auth.uid())
$$;
CREATE OR REPLACE FUNCTION public.merchant_in_order(_order_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.order_items oi JOIN public.merchants m ON m.id = oi.merchant_id WHERE oi.order_id = _order_id AND m.user_id = auth.uid())
$$;

CREATE POLICY "Shopper sees own order items" ON public.order_items FOR SELECT TO authenticated USING (public.owns_order(order_id));
CREATE POLICY "Merchant sees own order items" ON public.order_items FOR SELECT TO authenticated USING (public.owns_merchant(merchant_id));
CREATE POLICY "Admin sees order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Merchant updates own order items" ON public.order_items FOR UPDATE TO authenticated USING (public.owns_merchant(merchant_id)) WITH CHECK (public.owns_merchant(merchant_id));
CREATE POLICY "Admin updates order items" ON public.order_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Merchants view orders with their items" ON public.orders FOR SELECT TO authenticated USING (public.merchant_in_order(id));

CREATE OR REPLACE FUNCTION public.sync_order_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s text;
BEGIN
  SELECT CASE
    WHEN bool_and(status = 'cancelled') THEN 'cancelled'
    WHEN bool_or(status = 'pending') THEN 'pending'
    WHEN bool_or(status = 'shipped') THEN 'shipped'
    ELSE 'delivered' END
  INTO s FROM public.order_items WHERE order_id = NEW.order_id AND (status <> 'cancelled' OR NOT EXISTS (SELECT 1 FROM public.order_items x WHERE x.order_id = NEW.order_id AND x.status <> 'cancelled'));
  IF s IS NOT NULL THEN UPDATE public.orders SET status = s WHERE id = NEW.order_id AND status IS DISTINCT FROM s; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_items_sync AFTER UPDATE OF status ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.sync_order_status();

CREATE OR REPLACE FUNCTION public.take_stock(_product_id uuid, _qty integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.merchant_products SET stock = stock - _qty WHERE id = _product_id AND stock >= _qty;
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION public.take_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.take_stock(uuid, integer) TO service_role;

CREATE POLICY "Public reads product images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Users upload own product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);