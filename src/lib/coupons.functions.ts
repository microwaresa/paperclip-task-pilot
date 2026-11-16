import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const scope = z.enum(["store", "seller"]);
type Ctx = { supabase: any; userId: string };

/** Resolves which merchant_id the caller manages codes for: null = store-wide (admin only). */
async function ownerFor(context: Ctx, s: z.infer<typeof scope>): Promise<string | null> {
  if (s === "store") {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!data) throw new Error("هذه الصفحة للمسؤولين فقط");
    return null;
  }
  const { data } = await context.supabase.from("merchants").select("id").eq("user_id", context.userId).maybeSingle();
  if (!data) throw new Error("ليس لديك متجر بعد");
  return data.id as string;
}

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scope: "store" | "seller" }) => z.object({ scope }).parse(i))
  .handler(async ({ data, context }) => {
    const owner = await ownerFor(context, data.scope);
    let q = context.supabase.from("coupons").select("id, code, kind, value, min_order, max_uses, used_count, expires_at, active, created_at");
    q = owner ? q.eq("merchant_id", owner) : q.is("merchant_id", null);
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) throw new Error("تعذر تحميل الأكواد");
    return rows;
  });

const couponInput = z.object({
  scope,
  id: z.string().uuid().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "الكود من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا"),
  kind: z.enum(["percent", "fixed", "free_shipping"]),
  value: z.number().int().min(0).max(1_000_000),
  minOrder: z.number().int().min(0).max(1_000_000),
  maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  active: z.boolean(),
}).refine((c) => c.kind === "free_shipping" || c.value > 0, { message: "أدخل قيمة الخصم" })
  .refine((c) => c.kind !== "percent" || c.value <= 100, { message: "النسبة لا تتجاوز 100٪" });

export const saveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.input<typeof couponInput>) => couponInput.parse(i))
  .handler(async ({ data, context }) => {
    const owner = await ownerFor(context, data.scope);
    const row = { merchant_id: owner, code: data.code, kind: data.kind, value: data.kind === "free_shipping" ? 0 : data.value, min_order: data.minOrder, max_uses: data.maxUses, expires_at: data.expiresAt, active: data.active };
    let q = data.id ? context.supabase.from("coupons").update(row).eq("id", data.id) : context.supabase.from("coupons").insert(row);
    if (data.id) q = owner ? q.eq("merchant_id", owner) : q.is("merchant_id", null);
    const { error } = await q;
    if (error) throw new Error(error.code === "23505" ? "هذا الكود مستخدم بالفعل، اختر كودًا آخر" : "تعذر حفظ الكود");
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { scope: "store" | "seller"; id: string }) => z.object({ scope, id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const owner = await ownerFor(context, data.scope);
    let q = context.supabase.from("coupons").delete().eq("id", data.id);
    q = owner ? q.eq("merchant_id", owner) : q.is("merchant_id", null);
    const { error } = await q;
    if (error) throw new Error("تعذر حذف الكود");
    return { ok: true };
  });
