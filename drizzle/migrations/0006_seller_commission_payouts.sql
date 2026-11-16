ALTER TABLE public.merchants ADD COLUMN commission_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (commission_rate >= 0 AND commission_rate <= 100);
ALTER TABLE public.order_items ADD COLUMN commission_rate numeric(5,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.guard_merchant_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate)
     AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'only admin can change merchant status or commission';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_line_commission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.merchant_id IS NOT NULL THEN
    SELECT commission_rate INTO NEW.commission_rate FROM public.merchants WHERE id = NEW.merchant_id;
  END IF;
  NEW.commission_rate := COALESCE(NEW.commission_rate, 0);
  RETURN NEW;
END $$;
CREATE TRIGGER order_items_set_commission BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_line_commission();

CREATE TABLE public.merchant_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.merchant_payouts TO authenticated;
GRANT ALL ON public.merchant_payouts TO service_role;
ALTER TABLE public.merchant_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages payouts" ON public.merchant_payouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Seller sees own payouts" ON public.merchant_payouts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = merchant_id AND m.user_id = auth.uid()));