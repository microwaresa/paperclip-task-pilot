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
    // Cancel affects every line (and returns seller stock); other steps move the store's own lines.
    if (data.status === "cancelled") {
      const { data: lines } = await context.supabase.from("order_items").select("product_id, qty, merchant_id, status").eq("order_id", data.id);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      for (const l of lines ?? []) if (l.merchant_id && l.status !== "cancelled") await supabaseAdmin.rpc("return_stock", { _product_id: l.product_id, _qty: l.qty });
      await context.supabase.from("order_items").update({ status: "cancelled" }).eq("order_id", data.id);
    } else {
      await context.supabase.from("order_items").update({ status: data.status }).eq("order_id", data.id).is("merchant_id", null);
    }
    return { ok: true };
  });

export const adminUpdateDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { shippingFee: number; freeShippingMin: number; payoutHoldDays: number }) =>
    z.object({ shippingFee: z.number().int().min(0).max(1000), freeShippingMin: z.number().int().min(0).max(100000), payoutHoldDays: z.number().int().min(0).max(90) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("store_settings")
      .update({ shipping_fee: data.shippingFee, free_shipping_min: data.freeShippingMin, payout_hold_days: data.payoutHoldDays, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error("تعذر حفظ الإعدادات");
    return { ok: true };
  });

export const MERCHANT_STATUSES = ["pending", "approved", "suspended"] as const;

export const adminListMerchants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("merchants").select("id, store_name, slug, description, status, commission_rate, created_at").order("created_at", { ascending: false });
    if (error) throw new Error("تعذر تحميل البائعين");
    return data;
  });

export const adminSetMerchantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: string }) => z.object({ id: z.string().uuid(), status: z.enum(MERCHANT_STATUSES) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("merchants").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("تعذر تحديث حالة البائع");
    return { ok: true };
  });

export const adminSetCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; rate: number }) => z.object({ id: z.string().uuid(), rate: z.number().min(0).max(100) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("merchants").update({ commission_rate: data.rate }).eq("id", data.id);
    if (error) throw new Error("تعذر حفظ العمولة");
    return { ok: true };
  });

export const adminMerchantLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [lines, payouts] = await Promise.all([
      context.supabase.from("order_items").select("price, qty, status, commission_rate, delivered_at").eq("merchant_id", data.id),
      context.supabase.from("merchant_payouts").select("id, amount, note, created_at").eq("merchant_id", data.id).order("created_at", { ascending: false }),
    ]);
    if (lines.error || payouts.error) throw new Error("تعذر تحميل الأرباح");
    return { lines: lines.data, payouts: payouts.data };
  });

export const adminAddPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; amount: number; note: string }) => z.object({ id: z.string().uuid(), amount: z.number().positive().max(10_000_000), note: z.string().trim().max(200) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("merchant_payouts").insert({ merchant_id: data.id, amount: data.amount, note: data.note });
    if (error) throw new Error("تعذر تسجيل الدفعة");
    return { ok: true };
  });

export const adminDeletePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("merchant_payouts").delete().eq("id", data.id);
    if (error) throw new Error("تعذر حذف الدفعة");
    return { ok: true };
  });
