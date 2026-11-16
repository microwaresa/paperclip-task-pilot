import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getProduct } from "./catalog";
import { computeTotals, MAX_QTY } from "./pricing";

const orderInput = z.object({
  items: z.array(z.object({ id: z.string().max(100), qty: z.number().int().min(1).max(MAX_QTY) })).min(1).max(50),
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^01[0125][0-9]{8}$/),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(300),
  notes: z.string().trim().max(500).optional(),
});

export type OrderItem = { id: string; name: string; price: number; qty: number };

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof orderInput>) => orderInput.parse(input))
  .handler(async ({ data, context }) => {
    const items: OrderItem[] = data.items.map((l) => {
      const product = getProduct(l.id);
      if (!product) throw new Error("منتج غير متاح");
      return { id: product.id, name: product.name, price: product.price, qty: l.qty };
    });
    const { readDeliverySettings } = await import("./settings.server");
    const totals = computeTotals(items, await readDeliverySettings());
    // Shoppers can only read orders; the server writes them so prices always come from the catalog.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    if (error) throw new Error("تعذر حفظ الطلب، حاول مرة أخرى");
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
