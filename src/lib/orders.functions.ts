import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_QTY } from "./pricing";

const orderInput = z.object({
  items: z.array(z.object({ id: z.string().max(100), qty: z.number().int().min(1).max(MAX_QTY) })).min(1).max(50),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^01[0125][0-9]{8}$/),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(300),
  notes: z.string().trim().max(500).optional(),
  couponCode: z.string().trim().max(40).optional(),
});

export type OrderItem = { id: string; name: string; price: number; qty: number; merchantId?: string | null; seller?: string };

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof orderInput>) => orderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { priceCart, quoteCoupon } = await import("./checkout.server");
    const { items, totals } = await priceCart(data.items);
    let discount = 0; let couponId: string | null = null; let couponCode: string | null = null;
    let lineDiscounts = items.map(() => 0);
    if (data.couponCode) {
      const q = await quoteCoupon(data.couponCode, items, totals.shipping);
      if (!q.ok) throw new Error(q.error);
      discount = q.discount; couponId = q.id; couponCode = q.code; lineDiscounts = q.lineDiscounts;
      const { data: used } = await supabaseAdmin.rpc("use_coupon", { _id: q.id });
      if (!used) throw new Error("تم استخدام هذا الكود بالكامل");
    }
    const releaseCoupon = async () => { if (couponId) { const { data: c } = await supabaseAdmin.from("coupons").select("used_count").eq("id", couponId).single(); if (c) await supabaseAdmin.from("coupons").update({ used_count: Math.max(0, c.used_count - 1) }).eq("id", couponId); } };
    // Reserve seller stock; put back what was taken if any item runs out.
    const taken: OrderItem[] = [];
    for (const it of items.filter((i) => i.merchantId)) {
      const { data: ok } = await supabaseAdmin.rpc("take_stock", { _product_id: it.id, _qty: it.qty });
      if (!ok) {
        for (const t of taken) await supabaseAdmin.rpc("return_stock", { _product_id: t.id, _qty: t.qty });
        await releaseCoupon();
        throw new Error(`نفدت الكمية من «${it.name}»`);
      }
      taken.push(it);
    }
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        full_name: data.fullName,
        phone: data.phone,
        city: data.city,
        address: data.address,
        notes: data.notes || null,
        items,
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        discount,
        coupon_code: couponCode,
        total: Math.max(0, totals.total - discount),
        payment_method: "cod",
      })
      .select("id")
      .single();
    if (error) {
      for (const t of taken) await supabaseAdmin.rpc("return_stock", { _product_id: t.id, _qty: t.qty });
      await releaseCoupon();
      throw new Error("تعذر حفظ الطلب، حاول مرة أخرى");
    }
    const { error: linesError } = await supabaseAdmin.from("order_items").insert(
      items.map((i, n) => ({ discount: lineDiscounts[n] ?? 0, order_id: row.id, merchant_id: i.merchantId ?? null, product_id: i.id, name: i.name, price: i.price, qty: i.qty })),
    );
    if (linesError) console.error("order_items insert failed", linesError);
    return { id: row.id };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, created_at, status, items, subtotal, shipping, discount, coupon_code, total, city, address, full_name, phone")
      .order("created_at", { ascending: false });
    if (error) throw new Error("تعذر تحميل الطلبات");
    return data.map((o) => ({ ...o, items: o.items as unknown as OrderItem[] }));
  });

/** Check a discount code against the current cart before placing the order. */
export const previewCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string; items: { id: string; qty: number }[] }) =>
    z.object({ code: z.string().trim().min(1).max(40), items: orderInput.shape.items }).parse(i))
  .handler(async ({ data }) => {
    const { priceCart, quoteCoupon } = await import("./checkout.server");
    const { items, totals } = await priceCart(data.items);
    const q = await quoteCoupon(data.code, items, totals.shipping);
    return q.ok ? { ok: true as const, code: q.code, kind: q.kind, discount: q.discount } : { ok: false as const, error: q.error };
  });
