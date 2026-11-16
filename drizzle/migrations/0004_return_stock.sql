CREATE OR REPLACE FUNCTION public.return_stock(_product_id uuid, _qty integer) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.merchant_products SET stock = stock + _qty WHERE id = _product_id;
$$;
REVOKE EXECUTE ON FUNCTION public.return_stock(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.return_stock(uuid, integer) TO service_role;