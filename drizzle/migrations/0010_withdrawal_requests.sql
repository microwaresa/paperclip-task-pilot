CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('bank','instapay','wallet')),
  account_details text NOT NULL CHECK (char_length(account_details) BETWEEN 3 AND 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected')),
  admin_note text NOT NULL DEFAULT '',
  payout_id uuid REFERENCES public.merchant_payouts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX withdrawal_requests_merchant_idx ON public.withdrawal_requests(merchant_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seller sees own withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated USING (public.owns_merchant(merchant_id));
CREATE POLICY "Seller requests withdrawal" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (public.owns_merchant(merchant_id) AND status = 'pending');
CREATE POLICY "Admin sees withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin decides withdrawals" ON public.withdrawal_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Payable balance: delivered lines past the hold period, net of commission and seller discounts, minus recorded payouts.
CREATE OR REPLACE FUNCTION public.merchant_available_balance(_merchant_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT round(
    coalesce((SELECT sum((oi.price * oi.qty - oi.discount) * (1 - oi.commission_rate / 100))
      FROM order_items oi
      WHERE oi.merchant_id = _merchant_id AND oi.status = 'delivered'
        AND (oi.delivered_at IS NULL OR oi.delivered_at + make_interval(days => (SELECT payout_hold_days FROM store_settings WHERE id = 1)) <= now())), 0)
    - coalesce((SELECT sum(amount) FROM merchant_payouts WHERE merchant_id = _merchant_id), 0), 2)
$$;
REVOKE EXECUTE ON FUNCTION public.merchant_available_balance(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.merchant_available_balance(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_withdrawal_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pending numeric;
BEGIN
  NEW.status := 'pending'; NEW.admin_note := ''; NEW.payout_id := NULL; NEW.decided_at := NULL; NEW.created_at := now();
  PERFORM pg_advisory_xact_lock(hashtext(NEW.merchant_id::text));
  SELECT coalesce(sum(amount), 0) INTO pending FROM withdrawal_requests WHERE merchant_id = NEW.merchant_id AND status = 'pending';
  IF NEW.amount > public.merchant_available_balance(NEW.merchant_id) - pending THEN
    RAISE EXCEPTION 'withdrawal exceeds balance' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER withdrawal_insert_guard BEFORE INSERT ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.guard_withdrawal_insert();

-- Decisions are final and only pending requests can be decided; amount/details never change.
CREATE OR REPLACE FUNCTION public.guard_withdrawal_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'withdrawal already decided'; END IF;
  NEW.merchant_id := OLD.merchant_id; NEW.amount := OLD.amount; NEW.method := OLD.method;
  NEW.account_details := OLD.account_details; NEW.created_at := OLD.created_at;
  IF NEW.status <> 'pending' THEN NEW.decided_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER withdrawal_update_guard BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.guard_withdrawal_update();