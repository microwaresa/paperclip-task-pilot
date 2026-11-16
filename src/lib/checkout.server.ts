import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getProduct, isSellerProductId } from "./catalog";
import { effectivePrice } from "./market";
import { applyCoupon, computeTotals, type CouponRule } from "./pricing";
import { readDeliverySettings } from "./settings.server";
import type { OrderItem } from "./orders.functions";

/** Recompute every line from the catalog / live seller rows; never trust browser prices. */
export async function priceCart(lines: { id: string; qty: number }[]) {
  const sellerIds = lines.filter((l) => isSellerProductId(l.id)).map((l) => l.id);
  const sellerRows = new Map<string, { name: string; price: number; stock: number; merchant_id: string; seller: string }>();
  if (sellerIds.length) {
    const { data: rows } = await supabaseAdmin.from("merchant_products")
      .select("id, name, price, sale_price, sale_ends_at, stock, merchant_id, active, merchants!inner(store_name, status)").in("id", sellerIds);
    for (const r of rows ?? []) {
      const m = r.merchants as unknown as { store_name: string; status: string };
      if (r.active && m.status === "approved") sellerRows.set(r.id, { name: r.name, price: effectivePrice(r), stock: r.stock, merchant_id: r.merchant_id, seller: m.store_name });
    }
  }
  const items: OrderItem[] = lines.map((l) => {
    const sp = sellerRows.get(l.id);
    if (sp) {
      if (sp.stock < l.qty) throw new Error(`الكمية المتاحة من «${sp.name}» هي ${sp.stock} فقط`);
      return { id: l.id, name: sp.name, price: sp.price, qty: l.qty, merchantId: sp.merchant_id, seller: sp.seller };
    }
    const product = getProduct(l.id);
    if (!product) throw new Error("منتج غير متاح");
    return { id: product.id, name: product.name, price: product.price, qty: l.qty, merchantId: null };
  });
  return { items, totals: computeTotals(items, await readDeliverySettings()) };
}

/** Look up a code and work out its discount on these items. */
export async function quoteCoupon(code: string, items: OrderItem[], shipping: number) {
  const { data } = await supabaseAdmin.from("coupons")
    .select("id, code, kind, value, min_order, merchant_id, active, expires_at, max_uses, used_count")
    .eq("code", code.trim().toUpperCase()).maybeSingle();
  if (!data) return { ok: false as const, error: "كود الخصم غير صحيح" };
  const r = applyCoupon(data as CouponRule, items, shipping);
  return r.ok ? { ...r, id: data.id, code: data.code, kind: data.kind } : r;
}
