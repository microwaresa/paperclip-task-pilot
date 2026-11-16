import { queryOptions, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { fmt } from "@/lib/catalog";
import { deleteCoupon, listCoupons, saveCoupon } from "@/lib/coupons.functions";

type Scope = "store" | "seller";
const couponsQuery = (scope: Scope) => queryOptions({ queryKey: ["coupons", scope], queryFn: () => listCoupons({ data: { scope } }) });
const kindLabel: Record<string, string> = { percent: "نسبة مئوية", fixed: "مبلغ ثابت", free_shipping: "توصيل مجاني" };
const input = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

export function describeCoupon(c: { kind: string; value: number }) {
  return c.kind === "percent" ? `خصم ${fmt(c.value)}٪` : c.kind === "fixed" ? `خصم ${fmt(c.value)} ج.م` : "توصيل مجاني";
}

export function CouponManager({ scope }: { scope: Scope }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(couponsQuery(scope));
  const save = useServerFn(saveCoupon);
  const remove = useServerFn(deleteCoupon);
  const [f, setF] = useState({ code: "", kind: "percent", value: "10", minOrder: "0", maxUses: "", expiresAt: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["coupons", scope] });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: { scope, code: f.code, kind: f.kind as "percent", value: Number(f.value) || 0, minOrder: Number(f.minOrder) || 0,
        maxUses: f.maxUses ? Number(f.maxUses) : null, expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null, active: true } });
      toast.success("تم إنشاء الكود");
      setF((x) => ({ ...x, code: "" }));
      await refresh();
    } catch (err) { toast.error(msg(err)); } finally { setBusy(false); }
  }

  async function toggle(c: NonNullable<typeof data>[number]) {
    try {
      await save({ data: { scope, id: c.id, code: c.code, kind: c.kind as "percent", value: c.value, minOrder: c.min_order, maxUses: c.max_uses, expiresAt: c.expires_at ? new Date(c.expires_at).toISOString() : null, active: !c.active } });
      await refresh();
    } catch (err) { toast.error(msg(err)); }
  }

  return (
    <section className="space-y-3 rounded-lg bg-card p-4">
      <h2 className="text-lg font-black">أكواد الخصم {scope === "seller" && <span className="text-sm font-normal text-muted-foreground">— تنطبق على منتجات متجرك فقط</span>}</h2>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <label className="text-sm font-bold">الكود<input required dir="ltr" placeholder="SALE10" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} className={input} /></label>
        <label className="text-sm font-bold">النوع
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={input}>{Object.entries(kindLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        {f.kind !== "free_shipping" && <label className="text-sm font-bold">{f.kind === "percent" ? "النسبة ٪" : "المبلغ (ج.م)"}<input required type="number" min={1} max={f.kind === "percent" ? 100 : undefined} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className={input} /></label>}
        <label className="text-sm font-bold">حد أدنى للطلب<input type="number" min={0} value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: e.target.value })} className={input} /></label>
        <label className="text-sm font-bold">عدد الاستخدامات<input type="number" min={1} placeholder="بلا حد" value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} className={input} /></label>
        <label className="text-sm font-bold">ينتهي في<input type="datetime-local" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} className={input} /></label>
        <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-60 sm:col-span-3 lg:col-span-6 lg:w-fit">{busy ? "جارٍ الحفظ..." : "إنشاء الكود"}</button>
      </form>
      {isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل...</p> : !data?.length ? <p className="text-sm text-muted-foreground">لا توجد أكواد بعد.</p> : (
        <ul className="divide-y text-sm">
          {data.map((c) => {
            const expired = !!c.expires_at && new Date(c.expires_at).getTime() <= Date.now();
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span dir="ltr" className="rounded bg-muted px-2 font-mono font-black">{c.code}</span>
                <span className="font-bold">{describeCoupon(c)}</span>
                {c.min_order > 0 && <span className="text-muted-foreground">حد أدنى {fmt(c.min_order)} ج.م</span>}
                <span className="text-muted-foreground">استُخدم {fmt(c.used_count)}{c.max_uses ? ` من ${fmt(c.max_uses)}` : ""}</span>
                {c.expires_at && <span className={expired ? "text-destructive" : "text-muted-foreground"}>{expired ? "منتهي" : `حتى ${new Date(c.expires_at).toLocaleString("ar-EG")}`}</span>}
                <span className="ms-auto flex items-center gap-2">
                  <button onClick={() => toggle(c)} className={`rounded-full px-3 py-1 text-xs font-bold ${c.active ? "bg-success text-accent-foreground" : "bg-muted"}`}>{c.active ? "مفعل" : "موقوف"}</button>
                  <button aria-label="حذف الكود" onClick={async () => { if (!confirm("حذف هذا الكود؟")) return; try { await remove({ data: { scope, id: c.id } }); await refresh(); } catch (err) { toast.error(msg(err)); } }} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function msg(err: unknown) {
  const m = (err as Error).message ?? "";
  try { const j = JSON.parse(m); if (Array.isArray(j)) return j[0]?.message ?? "تعذر الحفظ"; } catch { /* not zod */ }
  return m || "تعذر الحفظ";
}
