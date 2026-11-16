import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OrderItem } from "./orders.functions";

export const ORDER_STATUSES = ["pending", "shipped", "delivered", "cancelled"] as const;

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("هذه الصفحة للمسؤولين فقط");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, created_at, status, items, subtotal, shipping, total, city, address, full_name, phone, notes")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("تعذر تحميل الطلبات");
    return data.map((o) => ({ ...o, items: o.items as unknown as OrderItem[] }));
  });

export const adminUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: string }) => z.object({ id: z.string().uuid(), status: z.enum(ORDER_STATUSES) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("تعذر تحديث الحالة");
    return { ok: true };
  });

export const adminUpdateDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { shippingFee: number; freeShippingMin: number }) =>
    z.object({ shippingFee: z.number().int().min(0).max(1000), freeShippingMin: z.number().int().min(0).max(100000) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("store_settings")
      .update({ shipping_fee: data.shippingFee, free_shipping_min: data.freeShippingMin, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error("تعذر حفظ الإعدادات");
    return { ok: true };
  });
