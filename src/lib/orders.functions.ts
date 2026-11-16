import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getProduct, isSellerProductId } from "./catalog";
import { computeTotals, MAX_QTY } from "./pricing";

const orderInput = z.object({
  items: z.array(z.object({ id: z.string().max(100), qty: z.number().int().min(1).max(MAX_QTY) })).min(1).max(50),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^01[0125][0-9]{8}$/),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(300),
  notes: z.string().trim().max(500).optional(),
});

export type OrderItem = { id: string; name: string; price: number; qty: number; merchantId?: string | null; seller?: string };

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof orderInput>) => orderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Seller products: read live price/stock with the server client, never trust the browser.
    const sellerIds = data.items.filter((l) => isSellerProductId(l.id)).map((l) => l.id);
    const sellerRows = new Map<string, { name: string; price: number; stock: number; merchant_id: string; seller: string }>();
    if (sellerIds.length) {
      const { data: rows } = await supabaseAdmin.from("merchant_products")
        .select("id, name, price, stock, merchant_id, active, merchants!inner(store_name, status)").in("id", sellerIds);
      for (const r of rows ?? []) {
        const m = r.merchants as unknown as { store_name: string; status: string };
        if (r.active && m.status === "approved") sellerRows.set(r.id, { name: r.name, price: r.price, stock: r.stock, merchant_id: r.merchant_id, seller: m.store_name });
      }
    }
    const items: OrderItem[] = data.items.map((l) => {
      const sp = sellerRows.get(l.id);
      if (sp) {
        if (sp.stock < l.qty) throw new Error(`الكمية المتاحة من «${sp.name}» هي ${sp.stock} فقط`);
        return { id: l.id, name: sp.name, price: sp.price, qty: l.qty, merchantId: sp.merchant_id, seller: sp.seller };
      }
      const product = getProduct(l.id);
      if (!product) throw new Error("منتج غير متاح");
      return { id: product.id, name: product.name, price: product.price, qty: l.qty, merchantId: null };
    });
    const { readDeliverySettings } = await import("./settings.server");
    const totals = computeTotals(items, await readDeliverySettings());
    // Reserve seller stock; put back what was taken if any item runs out.
    const taken: OrderItem[] = [];
    for (const it of items.filter((i) => i.merchantId)) {
      const { data: ok } = await supabaseAdmin.rpc("take_stock", { _product_id: it.id, _qty: it.qty });
      if (!ok) {
        for (const t of taken) await supabaseAdmin.rpc("return_stock", { _product_id: t.id, _qty: t.qty });
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
        ...totals,
        payment_method: "cod",
      })
      .select("id")
      .single();
    if (error) {
      for (const t of taken) await supabaseAdmin.rpc("return_stock", { _product_id: t.id, _qty: t.qty });
      throw new Error("تعذر حفظ الطلب، حاول مرة أخرى");
    }
    const { error: linesError } = await supabaseAdmin.from("order_items").insert(
      items.map((i) => ({ order_id: row.id, merchant_id: i.merchantId ?? null, product_id: i.id, name: i.name, price: i.price, qty: i.qty })),
    );
    if (linesError) console.error("order_items insert failed", linesError);
    return { id: row.id };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, created_at, status, items, subtotal, shipping, total, city, address, full_name, phone")
      .order("created_at", { ascending: false });
    if (error) throw new Error("تعذر تحميل الطلبات");
    return data.map((o) => ({ ...o, items: o.items as unknown as OrderItem[] }));
  });
