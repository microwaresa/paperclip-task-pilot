ALTER TABLE public.store_settings ADD COLUMN payout_hold_days integer NOT NULL DEFAULT 7 CHECK (payout_hold_days >= 0 AND payout_hold_days <= 90);
ALTER TABLE public.order_items ADD COLUMN delivered_at timestamptz;
UPDATE public.order_items SET delivered_at = created_at WHERE status = 'delivered' AND delivered_at IS NULL;

CREATE OR REPLACE FUNCTION public.stamp_line_delivered() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN NEW.delivered_at := now();
  ELSIF NEW.status <> 'delivered' THEN NEW.delivered_at := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_items_stamp_delivered BEFORE UPDATE OF status ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.stamp_line_delivered();