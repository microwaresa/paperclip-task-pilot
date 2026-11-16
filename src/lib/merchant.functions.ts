import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { categories } from "./catalog";
import { nextSellerStatus } from "./merchant-stats";

const catSlugs = categories.map((c) => c.slug) as [string, ...string[]];

export const getMyMerchant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("merchants").select("id, store_name, slug, description, status, created_at").eq("user_id", context.userId).maybeSingle();
    return data;
  });

const storeInput = z.object({
  storeName: z.string().trim().min(2).max(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/),
  description: z.string().trim().max(500),
});

export const applyAsMerchant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.input<typeof storeInput>) => storeInput.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("merchants").insert({ user_id: context.userId, store_name: data.storeName, slug: data.slug, description: data.description, status: "pending" });
    if (error) throw new Error(error.code === "23505" ? (error.message.includes("slug") ? "رابط المتجر مستخدم، اختر رابطًا آخر" : "لديك متجر بالفعل") : "تعذر إرسال الطلب");
    return { ok: true };
  });

export const updateMyStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { storeName: string; description: string }) => storeInput.pick({ storeName: true, description: true }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("merchants").update({ store_name: data.storeName, description: data.description }).eq("user_id", context.userId);
    if (error) throw new Error("تعذر حفظ بيانات المتجر");
    return { ok: true };
  });

async function myMerchantId(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.from("merchants").select("id, status").eq("user_id", context.userId).maybeSingle();
  if (!data) throw new Error("ليس لديك متجر بعد");
  return data as { id: string; status: string };
}

export const listMyProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await myMerchantId(context);
    const { data, error } = await context.supabase.from("merchant_products").select("*").eq("merchant_id", m.id).order("created_at", { ascending: false });
    if (error) throw new Error("تعذر تحميل المنتجات");
    return data;
  });

const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(150),
  brand: z.string().trim().max(60),
  category: z.enum(catSlugs),
  price: z.number().int().min(1).max(1_000_000),
  oldPrice: z.number().int().max(1_000_000).nullable(),
  description: z.string().trim().max(2000),
  imageUrl: z.string().url().max(2000).nullable(),
  stock: z.number().int().min(0).max(100_000),
  active: z.boolean(),
}).refine((p) => p.oldPrice === null || p.oldPrice >= p.price, { message: "السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي" });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.input<typeof productInput>) => productInput.parse(i))
  .handler(async ({ data, context }) => {
    const m = await myMerchantId(context);
    const row = { merchant_id: m.id, name: data.name, brand: data.brand, category: data.category, price: data.price, old_price: data.oldPrice, description: data.description, image_url: data.imageUrl, stock: data.stock, active: data.active };
    const { error } = data.id
      ? await context.supabase.from("merchant_products").update(row).eq("id", data.id).eq("merchant_id", m.id)
      : await context.supabase.from("merchant_products").insert(row);
    if (error) throw new Error("تعذر حفظ المنتج");
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const m = await myMerchantId(context);
    const { error } = await context.supabase.from("merchant_products").delete().eq("id", data.id).eq("merchant_id", m.id);
    if (error) throw new Error("تعذر حذف المنتج");
    return { ok: true };
  });

export const listMyOrderLines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await myMerchantId(context);
    const { data, error } = await context.supabase.from("order_items")
      .select("id, order_id, product_id, name, price, qty, status, created_at, orders(full_name, phone, city, address, notes)")
      .eq("merchant_id", m.id).order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error("تعذر تحميل الطلبات");
    return data;
  });

export const advanceOrderLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const m = await myMerchantId(context);
    const { data: line } = await context.supabase.from("order_items").select("status").eq("id", data.id).eq("merchant_id", m.id).maybeSingle();
    const next = line ? nextSellerStatus(line.status) : null;
    if (!next) throw new Error("لا يمكن تحديث هذا الطلب");
    const { error } = await context.supabase.from("order_items").update({ status: next }).eq("id", data.id).eq("merchant_id", m.id);
    if (error) throw new Error("تعذر تحديث الحالة");
    return { status: next };
  });
