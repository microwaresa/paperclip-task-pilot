import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Clock, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { categories, fmt } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import {
  advanceOrderLine, applyAsMerchant, deleteProduct, getMyMerchant, listMyOrderLines, listMyPayouts, listMyProducts, listMyWithdrawals, requestWithdrawal, saveProduct, updateMyStore,
} from "@/lib/merchant.functions";
import { nextSellerStatus, sellerEarnings, sellerSummary, withdrawable, WITHDRAW_MIN } from "@/lib/merchant-stats";
import { NO_IMAGE } from "@/lib/market";
import { deliveryQuery } from "@/lib/settings.functions";
import { StoreLayout } from "@/components/store/StoreLayout";
import { CouponManager } from "@/components/store/CouponManager";
import { listCoupons } from "@/lib/coupons.functions";
import { countNew, markSellerOrdersSeen, useSeenAt } from "@/lib/seller-alerts";
import { useEffect } from "react";

const merchantQuery = queryOptions({ queryKey: ["my-merchant"], queryFn: () => getMyMerchant() });
const productsQuery = queryOptions({ queryKey: ["my-products"], queryFn: () => listMyProducts() });
const linesQuery = queryOptions({ queryKey: ["my-order-lines"], queryFn: () => listMyOrderLines(), refetchInterval: 30_000 });
const payoutsQuery = queryOptions({ queryKey: ["my-payouts"], queryFn: () => listMyPayouts() });
const withdrawalsQuery = queryOptions({ queryKey: ["my-withdrawals"], queryFn: () => listMyWithdrawals(), refetchInterval: 30_000 });
const methodLabel: Record<string, string> = { bank: "تحويل بنكي", instapay: "إنستاباي", wallet: "محفظة إلكترونية" };
const wStatus: Record<string, { l: string; c: string }> = { pending: { l: "قيد المراجعة", c: "bg-muted text-foreground" }, paid: { l: "تم الدفع", c: "bg-secondary text-secondary-foreground" }, rejected: { l: "مرفوض", c: "bg-destructive text-destructive-foreground" } };
const statusLabel: Record<string, string> = { pending: "بانتظار الشحن", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };
const input = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

export const Route = createFileRoute("/_authenticated/merchant")({
  loader: ({ context }) => context.queryClient.ensureQueryData(merchantQuery),
  head: () => ({
    meta: [
      { title: "لوحة البائع | سين" },
      { name: "description", content: "إدارة متجرك على سين: المنتجات والطلبات والمبيعات." },
      { property: "og:title", content: "لوحة البائع | سين" },
      { property: "og:description", content: "إدارة متجرك على سين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MerchantPage,
  errorComponent: MerchantError,
});

function MerchantError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <StoreLayout>
      <div className="rounded-lg bg-card py-16 text-center">
        <p className="font-bold">{(error as Error)?.message || "تعذر فتح لوحة البائع"}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">حاول مرة أخرى</button>
      </div>
    </StoreLayout>
  );
}

function MerchantPage() {
  const { data: merchant } = useSuspenseQuery(merchantQuery);
  return (
    <StoreLayout>
      {!merchant ? <ApplyForm /> : merchant.status !== "approved" ? (
        <div className="rounded-lg bg-card p-8 text-center">
          <Clock className="mx-auto h-10 w-10 text-accent" />
          <h1 className="mt-3 text-xl font-black">{merchant.status === "pending" ? "طلبك قيد المراجعة" : "متجرك موقوف"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {merchant.status === "pending" ? `استلمنا طلب فتح متجر «${merchant.store_name}». ستتمكن من إضافة المنتجات بعد موافقة الإدارة.` : "تواصل مع إدارة سين لمعرفة السبب."}
          </p>
        </div>
      ) : <Dashboard merchant={merchant} />}
    </StoreLayout>
  );
}

function ApplyForm() {
  const qc = useQueryClient();
  const apply = useServerFn(applyAsMerchant);
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) { toast.error("رابط المتجر: حروف إنجليزية صغيرة وأرقام و - فقط (٣ أحرف على الأقل)"); return; }
    setBusy(true);
    try {
      await apply({ data: { storeName, slug, description } });
      await qc.invalidateQueries({ queryKey: merchantQuery.queryKey });
      toast.success("تم إرسال طلبك");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-lg space-y-3 rounded-lg bg-card p-6">
      <h1 className="text-2xl font-black">افتح متجرك على سين</h1>
      <p className="text-sm text-muted-foreground">املأ البيانات وستراجع الإدارة طلبك.</p>
      <label className="block text-sm font-bold">اسم المتجر<input required minLength={2} maxLength={60} value={storeName} onChange={(e) => setStoreName(e.target.value)} className={input} /></label>
      <label className="block text-sm font-bold">رابط المتجر (بالإنجليزية)
        <input required dir="ltr" placeholder="my-store" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} className={input} />
        <span className="mt-1 block text-xs font-normal text-muted-foreground" dir="ltr">/store/{slug || "my-store"}</span>
      </label>
      <label className="block text-sm font-bold">وصف المتجر<textarea maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={input} /></label>
      <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 font-black text-primary-foreground disabled:opacity-60">{busy ? "جارٍ..." : "إرسال الطلب"}</button>
    </form>
  );
}

type Merchant = NonNullable<Awaited<ReturnType<typeof getMyMerchant>>>;
const tabs = [{ v: "summary", l: "ملخص المبيعات" }, { v: "orders", l: "الطلبات" }, { v: "products", l: "المنتجات" }, { v: "coupons", l: "أكواد الخصم" }, { v: "withdraw", l: "سحب الأرباح" }, { v: "store", l: "بيانات المتجر" }] as const;

function Dashboard({ merchant }: { merchant: Merchant }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["v"]>("summary");
  const lines = useQuery(linesQuery).data ?? [];
  const products = useQuery(productsQuery).data ?? [];
  const coupons = useQuery({ queryKey: ["coupons", "seller"], queryFn: () => listCoupons({ data: { scope: "seller" } }) }).data ?? [];
  const seenAt = useSeenAt();
  const fresh = countNew(lines, seenAt);
  useEffect(() => { if (tab === "orders" && fresh > 0) markSellerOrdersSeen(); }, [tab, fresh]);
  const toShip = lines.filter((l) => l.status === "pending").length;
  const pendingW = (useQuery(withdrawalsQuery).data ?? []).filter((w) => w.status === "pending").length;
  const counts: Record<string, { n: number; alert?: boolean } | undefined> = {
    summary: { n: new Set(lines.filter((l) => l.status !== "cancelled").map((l) => l.order_id)).size },
    orders: { n: fresh || toShip, alert: fresh > 0 || toShip > 0 },
    products: { n: products.length },
    coupons: { n: coupons.filter((c) => c.active).length },
    withdraw: pendingW ? { n: pendingW } : undefined,
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-black">لوحة البائع · {merchant.store_name}</h1>
        <Link to="/store/$slug" params={{ slug: merchant.slug }} className="flex items-center gap-1 text-sm font-bold text-accent"><ExternalLink className="h-4 w-4" />صفحة متجري</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => <button key={t.v} onClick={() => setTab(t.v)} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${tab === t.v ? "bg-primary text-primary-foreground" : "bg-card"}`}>{t.l}
          {counts[t.v] && <span title={t.v === "orders" ? (fresh ? "طلبات جديدة" : "بانتظار الشحن") : undefined} className={`min-w-5 rounded-full px-1.5 text-center text-xs leading-5 ${counts[t.v]!.alert ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>{fmt(counts[t.v]!.n)}</span>}
        </button>)}
      </div>
      {tab === "summary" && <Summary />}
      {tab === "orders" && <Orders />}
      {tab === "products" && <Products />}
      {tab === "coupons" && <CouponManager scope="seller" />}
      {tab === "withdraw" && <Withdrawals />}
      {tab === "store" && <StoreSettings merchant={merchant} />}
    </>
  );
}

function Summary() {
  const { data, isLoading } = useQuery(linesQuery);
  if (isLoading || !data) return <p className="rounded-lg bg-card py-12 text-center">جارٍ التحميل...</p>;
  const s = sellerSummary(data);
  const cards = [
    { l: "مبيعات تم توصيلها", v: `${fmt(s.deliveredRevenue)} ج.م` },
    { l: "مبيعات جارية", v: `${fmt(s.openRevenue)} ج.م` },
    { l: "عدد الطلبات", v: fmt(s.orders) },
    { l: "قطع مباعة", v: fmt(s.units) },
    { l: "بانتظار الشحن", v: fmt(s.toShip) },
  ];
  return (
    <>
      <Earnings lines={data} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => <div key={c.l} className="rounded-lg bg-card p-4"><div className="text-xs text-muted-foreground">{c.l}</div><div className="mt-1 text-xl font-black">{c.v}</div></div>)}
      </div>
      <section className="rounded-lg bg-card p-4">
        <h2 className="mb-2 font-black">الأكثر مبيعًا</h2>
        {s.top.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد مبيعات بعد</p> : (
          <ul className="divide-y text-sm">{s.top.map((t) => <li key={t.name} className="flex justify-between py-2"><span>{t.name}</span><span className="font-bold">{fmt(t.qty)} قطعة · {fmt(t.revenue)} ج.م</span></li>)}</ul>
        )}
      </section>
    </>
  );
}

function Earnings({ lines }: { lines: { price: number; qty: number; status: string; commission_rate: number; delivered_at: string | null }[] }) {
  const { data: merchant } = useSuspenseQuery(merchantQuery);
  const { data: payouts = [] } = useQuery(payoutsQuery);
  const { data: settings } = useQuery(deliveryQuery);
  const hold = settings?.payoutHoldDays ?? 7;
  const e = sellerEarnings(lines, payouts, hold);
  const cards = [
    { l: "إجمالي المبيعات المُسلّمة", v: e.gross },
    { l: `عمولة سين (${fmt(Number(merchant?.commission_rate ?? 0))}٪)`, v: e.commission },
    { l: "صافي أرباحك", v: e.net },
    { l: `قيد الانتظار (${fmt(hold)} أيام)`, v: e.held },
    { l: "تم دفعه لك", v: e.paid },
    { l: "رصيدك المستحق", v: e.balance, strong: true },
  ];
  return (
    <section className="rounded-lg bg-card p-4">
      <h2 className="mb-1 font-black">أرباحك والدفعات</h2>
      <p className="mb-3 text-xs text-muted-foreground">تصبح أرباح كل طلب قابلة للصرف بعد {fmt(hold)} أيام من توصيله. تحوّل إدارة سين رصيدك وتسجّل كل دفعة هنا.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {cards.map((c) => <div key={c.l} className={`rounded-lg p-3 ${c.strong ? "bg-secondary text-secondary-foreground" : "bg-muted"}`}><div className="text-xs opacity-80">{c.l}</div><div className="mt-1 text-lg font-black">{fmt(c.v)} ج.م</div></div>)}
      </div>
      {payouts.length > 0 && (
        <ul className="mt-3 divide-y text-sm">{payouts.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{new Date(p.created_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })}{p.note ? ` · ${p.note}` : ""}</span><span className="font-bold">{fmt(Number(p.amount))} ج.م</span></li>)}</ul>
      )}
    </section>
  );
}

function Withdrawals() {
  const qc = useQueryClient();
  const { data: lines } = useQuery(linesQuery);
  const { data: payouts } = useQuery(payoutsQuery);
  const { data: requests } = useQuery(withdrawalsQuery);
  const { data: settings } = useQuery(deliveryQuery);
  const submit = useServerFn(requestWithdrawal);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank" | "instapay" | "wallet">("instapay");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailsErr, setDetailsErr] = useState(false);
  if (!lines || !payouts || !requests) return <p className="rounded-lg bg-card py-12 text-center">جارٍ التحميل...</p>;
  const e = sellerEarnings(lines, payouts, settings?.payoutHoldDays ?? 7);
  const can = withdrawable(e.balance, requests);
  const pending = Math.round((e.balance - can) * 100) / 100;
  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const n = Number(amount);
    if (!(n >= WITHDRAW_MIN)) { toast.error(`أقل مبلغ للسحب ${fmt(WITHDRAW_MIN)} ج.م`); return; }
    if (n > can) { toast.error("المبلغ أكبر من رصيدك القابل للسحب"); return; }
    if (details.trim().length < 3) {
      setDetailsErr(true);
      document.getElementById("withdraw-details")?.focus();
      toast.error("اكتب بيانات استلام الدفعة في الخانة المظلّلة");
      return;
    }
    setBusy(true);
    try {
      await submit({ data: { amount: n, method, details } });
      setAmount(""); setDetails("");
      await qc.invalidateQueries({ queryKey: withdrawalsQuery.queryKey });
      toast.success("تم إرسال طلب السحب، ستراجعه إدارة سين قريبًا");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  const placeholder = method === "bank" ? "اسم البنك، اسم صاحب الحساب، رقم الحساب / IBAN" : method === "instapay" ? "عنوان إنستاباي أو رقم الموبايل" : "رقم المحفظة (فودافون كاش، اتصالات كاش...)";
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[{ l: "رصيدك المستحق", v: e.balance }, { l: "طلبات قيد المراجعة", v: pending }, { l: "متاح للسحب الآن", v: can, strong: true }, { l: "قيد الانتظار (لم يصبح مستحقًا)", v: e.held }].map((c) => (
          <div key={c.l} className={`rounded-lg p-4 ${c.strong ? "bg-secondary text-secondary-foreground" : "bg-card"}`}><div className="text-xs opacity-80">{c.l}</div><div className="mt-1 text-xl font-black">{fmt(c.v)} ج.م</div></div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg bg-card p-4">
        <h2 className="font-black">طلب سحب جديد</h2>
        {can < WITHDRAW_MIN ? <p className="text-sm text-muted-foreground">يمكنك طلب السحب عندما يصل رصيدك المتاح إلى {fmt(WITHDRAW_MIN)} ج.م على الأقل.</p> : (
          <>
            <label className="block text-sm font-bold">المبلغ (ج.م)
              <div className="flex gap-2"><input aria-label="مبلغ السحب" type="number" min={WITHDRAW_MIN} max={can} step="0.01" value={amount} onChange={(x) => setAmount(x.target.value)} className={input} />
                <button type="button" onClick={() => setAmount(String(can))} className="mt-1 rounded-md bg-muted px-3 text-xs font-bold">الكل</button></div>
            </label>
            <div className="text-sm font-bold">طريقة الاستلام
              <div className="mt-1 flex flex-wrap gap-2">{(["instapay", "wallet", "bank"] as const).map((m) => (
                <button type="button" key={m} onClick={() => setMethod(m)} className={`rounded-full px-4 py-1.5 text-sm ${method === m ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{methodLabel[m]}</button>
              ))}</div>
            </div>
            <label className="block text-sm font-bold">بيانات الاستلام ({methodLabel[method]}) <span className="text-destructive">*</span>
              <textarea id="withdraw-details" aria-label="بيانات الاستلام" aria-invalid={detailsErr} rows={2} maxLength={300} placeholder={placeholder} value={details}
                onChange={(x) => { setDetails(x.target.value); if (x.target.value.trim().length >= 3) setDetailsErr(false); }}
                className={`${input} ${detailsErr ? "border-destructive ring-2 ring-destructive" : ""}`} />
              <span className={`mt-1 block text-xs font-normal ${detailsErr ? "text-destructive" : "text-muted-foreground"}`}>{detailsErr ? "هذه الخانة مطلوبة: " : "إلى أين نرسل لك المبلغ؟ "}{placeholder}</span>
            </label>
            <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 font-black text-primary-foreground disabled:opacity-60">{busy ? "جارٍ..." : "إرسال طلب السحب"}</button>
          </>
        )}
      </form>
      <section className="rounded-lg bg-card p-4">
        <h2 className="mb-2 font-black">طلباتك السابقة</h2>
        {requests.length === 0 ? <p className="text-sm text-muted-foreground">لم ترسل أي طلب سحب بعد</p> : (
          <ul className="divide-y text-sm">{requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <div className="font-bold">{fmt(Number(r.amount))} ج.م · {methodLabel[r.method] ?? r.method}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })} · {r.account_details}{r.admin_note ? ` · ملاحظة الإدارة: ${r.admin_note}` : ""}</div>
              </div>
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${wStatus[r.status]?.c ?? ""}`}>{wStatus[r.status]?.l ?? r.status}{r.decided_at ? ` · ${new Date(r.decided_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })}` : ""}</span>
            </li>))}</ul>
        )}
      </section>
    </>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(linesQuery);
  const advance = useServerFn(advanceOrderLine);
  const [filter, setFilter] = useState("pending");
  if (isLoading || !data) return <p className="rounded-lg bg-card py-12 text-center">جارٍ التحميل...</p>;
  const shown = filter === "all" ? data : data.filter((l) => l.status === filter);
  async function move(id: string) {
    try {
      await advance({ data: { id } });
      await qc.invalidateQueries({ queryKey: linesQuery.queryKey });
      toast.success("تم تحديث حالة الطلب");
    } catch (err) { toast.error((err as Error).message); }
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {["pending", "shipped", "delivered", "cancelled", "all"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-sm font-bold ${filter === s ? "bg-secondary text-secondary-foreground" : "bg-card"}`}>{s === "all" ? "الكل" : statusLabel[s]}</button>
        ))}
      </div>
      {shown.length === 0 ? <p className="rounded-lg bg-card py-12 text-center font-bold">لا توجد طلبات</p> : (
        <ul className="space-y-3">
          {shown.map((l) => {
            const next = nextSellerStatus(l.status);
            const o = l.orders;
            return (
              <li key={l.id} className="rounded-lg bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <div><span className="font-black">طلب #{l.order_id.slice(0, 8).toUpperCase()}</span> <span className="text-muted-foreground">· {new Date(l.created_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold">{statusLabel[l.status]}</span>
                    {next && <button onClick={() => move(l.id)} className="rounded-md bg-primary px-3 py-1 font-bold text-primary-foreground">{next === "shipped" ? "تم الشحن" : "تم التوصيل"}</button>}
                  </div>
                </div>
                <p className="py-2 font-bold">{l.name} × {fmt(l.qty)} · {fmt(l.price * l.qty)} ج.م</p>
                {o && <p className="text-muted-foreground">{o.full_name} · <span dir="ltr">{o.phone}</span> · {o.city}، {o.address}{o.notes ? ` · ملاحظات: ${o.notes}` : ""}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

type Row = Awaited<ReturnType<typeof listMyProducts>>[number];
type Draft = { id?: string; name: string; brand: string; category: string; price: string; oldPrice: string; description: string; imageUrls: string[]; stock: string; active: boolean; salePrice: string; saleEndsAt: string };
const emptyDraft: Draft = { name: "", brand: "", category: categories[0]!.slug, price: "", oldPrice: "", description: "", imageUrls: [], stock: "1", active: true, salePrice: "", saleEndsAt: "" };
const toDraft = (r: Row): Draft => ({ id: r.id, name: r.name, brand: r.brand, category: r.category, price: String(r.price), oldPrice: r.old_price ? String(r.old_price) : "", description: r.description, imageUrls: r.image_urls?.length ? r.image_urls : r.image_url ? [r.image_url] : [], stock: String(r.stock), active: r.active, salePrice: r.sale_price ? String(r.sale_price) : "", saleEndsAt: r.sale_ends_at ? toLocalInput(r.sale_ends_at) : "" });
function toLocalInput(iso: string) { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(productsQuery);
  const remove = useServerFn(deleteProduct);
  const [draft, setDraft] = useState<Draft | null>(null);
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: productsQuery.queryKey }), qc.invalidateQueries({ queryKey: ["seller-products"] })]);
  async function del(id: string) {
    if (!confirm("حذف هذا المنتج؟")) return;
    try { await remove({ data: { id } }); await refresh(); toast.success("تم حذف المنتج"); } catch (err) { toast.error((err as Error).message); }
  }
  if (draft) return <ProductForm draft={draft} onDone={async (saved) => { if (saved) await refresh(); setDraft(null); }} />;
  return (
    <section className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-black">منتجاتي ({fmt(data?.length ?? 0)})</h2>
        <button onClick={() => setDraft(emptyDraft)} className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />منتج جديد</button>
      </div>
      {isLoading ? <p className="py-8 text-center">جارٍ التحميل...</p> : !data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">لم تضف منتجات بعد</p> : (
        <ul className="divide-y">
          {data.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
              <img src={p.image_urls?.[0] || p.image_url || NO_IMAGE} alt="" className="h-14 w-14 rounded bg-muted object-contain" />
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 font-bold">{p.name}</div>
                <div className="text-xs text-muted-foreground">{fmt(p.price)} ج.م · المخزون {fmt(p.stock)} {!p.active && "· مخفي"}{p.stock === 0 && " · نفدت الكمية"}</div>
              </div>
              <button aria-label="تعديل" onClick={() => setDraft(toDraft(p))} className="rounded p-2 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
              <button aria-label="حذف" onClick={() => del(p.id)} className="rounded p-2 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const MAX_PHOTOS = 8;

function ProductForm({ draft, onDone }: { draft: Draft; onDone: (saved: boolean) => void }) {
  const save = useServerFn(saveProduct);
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function upload(files: File[]) {
    const room = MAX_PHOTOS - d.imageUrls.length;
    if (room <= 0) { toast.error(`أقصى عدد ${MAX_PHOTOS} صور`); return; }
    if (files.length > room) toast.error(`سيتم رفع أول ${room} صور فقط`);
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      for (const file of files.slice(0, room)) {
        if (!file.type.startsWith("image/")) { toast.error(`${file.name}: ليست صورة`); continue; }
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: أقصى حجم ٥ ميجا`); continue; }
      const path = `${u.user!.id}/${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (sErr || !signed) throw sErr;
        const url = signed.signedUrl;
        setD((x) => ({ ...x, imageUrls: [...x.imageUrls, url] }));
      }
    } catch { toast.error("تعذر رفع الصورة"); } finally { setUploading(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const price = Number(d.price), stock = Number(d.stock), oldPrice = d.oldPrice ? Number(d.oldPrice) : null;
    if (!Number.isInteger(price) || price < 1) { toast.error("أدخل سعرًا صحيحًا"); return; }
    if (oldPrice !== null && (!Number.isInteger(oldPrice) || oldPrice < price)) { toast.error("السعر قبل الخصم يجب أن يكون أكبر من السعر"); return; }
    const salePrice = d.salePrice ? Number(d.salePrice) : null;
    const saleEndsAt = d.saleEndsAt ? new Date(d.saleEndsAt).toISOString() : null;
    if ((salePrice === null) !== (saleEndsAt === null)) { toast.error("لعرض محدد المدة أدخل سعر العرض وموعد انتهائه معًا"); return; }
    if (salePrice !== null && (!Number.isInteger(salePrice) || salePrice >= price)) { toast.error("سعر العرض يجب أن يكون أقل من السعر"); return; }
    if (!Number.isInteger(stock) || stock < 0) { toast.error("أدخل كمية صحيحة"); return; }
    setBusy(true);
    try {
      await save({ data: { ...(d.id ? { id: d.id } : {}), name: d.name, brand: d.brand, category: d.category, price, oldPrice, description: d.description, imageUrls: d.imageUrls, stock, active: d.active, salePrice, saleEndsAt } });
      toast.success("تم حفظ المنتج");
      onDone(true);
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg bg-card p-4 md:grid-cols-2">
      <h2 className="font-black md:col-span-2">{d.id ? "تعديل المنتج" : "منتج جديد"}</h2>
      <label className="block text-sm font-bold md:col-span-2">اسم المنتج<input required minLength={2} maxLength={150} value={d.name} onChange={(e) => set("name", e.target.value)} className={input} /></label>
      <label className="block text-sm font-bold">الماركة<input maxLength={60} value={d.brand} onChange={(e) => set("brand", e.target.value)} className={input} /></label>
      <label className="block text-sm font-bold">القسم
        <select value={d.category} onChange={(e) => set("category", e.target.value)} className={input}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
      </label>
      <label className="block text-sm font-bold">السعر (ج.م)<input required type="number" min={1} value={d.price} onChange={(e) => set("price", e.target.value)} className={input} /></label>
      <label className="block text-sm font-bold">السعر قبل الخصم (اختياري)<input type="number" min={1} value={d.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} className={input} /></label>
      <label className="block text-sm font-bold">سعر عرض محدد المدة (اختياري)<input type="number" min={1} value={d.salePrice} onChange={(e) => set("salePrice", e.target.value)} className={input} /></label>
      <label className="block text-sm font-bold">ينتهي العرض في<input type="datetime-local" value={d.saleEndsAt} onChange={(e) => set("saleEndsAt", e.target.value)} className={input} /></label>
      <label className="block text-sm font-bold">الكمية المتاحة<input required type="number" min={0} value={d.stock} onChange={(e) => set("stock", e.target.value)} className={input} /></label>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold"><input type="checkbox" checked={d.active} onChange={(e) => set("active", e.target.checked)} />معروض للمتسوقين</label>
      <label className="block text-sm font-bold md:col-span-2">الوصف<textarea maxLength={2000} rows={4} value={d.description} onChange={(e) => set("description", e.target.value)} className={input} /></label>
      <div className="md:col-span-2">
        <div className="mb-1 text-sm font-bold">صور المنتج ({d.imageUrls.length}/{MAX_PHOTOS}) <span className="font-normal text-muted-foreground">— الأولى هي الصورة الرئيسية</span></div>
        <div className="flex flex-wrap items-center gap-2">
          {d.imageUrls.map((url, i) => (
            <div key={url} className="relative">
              <img src={url} alt={`صورة ${i + 1}`} className={`h-20 w-20 rounded bg-muted object-contain ${i === 0 ? "ring-2 ring-primary" : ""}`} />
              <button type="button" aria-label="حذف الصورة" onClick={() => setD((x) => ({ ...x, imageUrls: x.imageUrls.filter((_, j) => j !== i) }))} className="absolute -top-2 -left-2 rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">×</button>
              {i > 0 && <button type="button" onClick={() => setD((x) => ({ ...x, imageUrls: [url, ...x.imageUrls.filter((_, j) => j !== i)] }))} className="absolute bottom-0 inset-x-0 bg-foreground/70 text-[10px] text-background">اجعلها الرئيسية</button>}
            </div>
          ))}
          {d.imageUrls.length === 0 && <img src={NO_IMAGE} alt="" className="h-20 w-20 rounded bg-muted object-contain" />}
          {d.imageUrls.length < MAX_PHOTOS && (
            <label className="cursor-pointer rounded-md border px-3 py-2 text-sm font-bold">{uploading ? "جارٍ الرفع..." : "رفع صور"}
              <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ""; if (fs.length) upload(fs); }} />
            </label>
          )}
        </div>
      </div>
      <div className="flex gap-2 md:col-span-2">
        <button disabled={busy || uploading} className="rounded-md bg-primary px-5 py-2 font-black text-primary-foreground disabled:opacity-60">{busy ? "جارٍ الحفظ..." : "حفظ"}</button>
        <button type="button" onClick={() => onDone(false)} className="rounded-md border px-5 py-2 font-bold">إلغاء</button>
      </div>
    </form>
  );
}

function StoreSettings({ merchant }: { merchant: Merchant }) {
  const qc = useQueryClient();
  const update = useServerFn(updateMyStore);
  const [storeName, setStoreName] = useState(merchant.store_name);
  const [description, setDescription] = useState(merchant.description);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await update({ data: { storeName, description } }); await qc.invalidateQueries({ queryKey: merchantQuery.queryKey }); toast.success("تم الحفظ"); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="max-w-lg space-y-3 rounded-lg bg-card p-4">
      <label className="block text-sm font-bold">اسم المتجر<input required minLength={2} maxLength={60} value={storeName} onChange={(e) => setStoreName(e.target.value)} className={input} /></label>
      <label className="block text-sm font-bold">الوصف<textarea maxLength={500} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={input} /></label>
      <p className="text-xs text-muted-foreground" dir="ltr">/store/{merchant.slug}</p>
      <button disabled={busy} className="rounded-md bg-primary px-5 py-2 font-black text-primary-foreground disabled:opacity-60">حفظ</button>
    </form>
  );
}
