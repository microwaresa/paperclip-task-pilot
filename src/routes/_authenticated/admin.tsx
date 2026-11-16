import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Package, Store, Wallet, TicketPercent, Settings, Search, RefreshCw, Truck, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmt } from "@/lib/catalog";
import { adminDecideWithdrawal, adminListWithdrawals, adminAddPayout, adminDeletePayout, adminMerchantLedger, adminSetCommission, adminListMerchants, adminListOrders, adminSetMerchantStatus, adminUpdateDelivery, adminUpdateStatus, ORDER_STATUSES } from "@/lib/admin.functions";
import { sellerEarnings } from "@/lib/merchant-stats";
import { CouponManager } from "@/components/store/CouponManager";
import { deliveryQuery } from "@/lib/settings.functions";
import { StoreLayout } from "@/components/store/StoreLayout";

const adminOrdersQuery = queryOptions({ queryKey: ["admin-orders"], queryFn: () => adminListOrders(), refetchInterval: 30_000 });
const statusLabel: Record<string, string> = { pending: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };

export const Route = createFileRoute("/_authenticated/admin")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminOrdersQuery),
  head: () => ({
    meta: [
      { title: "لوحة الإدارة | سين" },
      { name: "description", content: "إدارة طلبات متجر سين ورسوم التوصيل." },
      { property: "og:title", content: "لوحة الإدارة | سين" },
      { property: "og:description", content: "إدارة الطلبات ورسوم التوصيل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
  errorComponent: AdminError,
});

function AdminError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <StoreLayout>
      <div className="rounded-lg bg-card py-16 text-center">
        <p className="font-bold">{(error as Error)?.message || "تعذر فتح لوحة الإدارة"}</p>
        <Button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">حاول مرة أخرى</Button>
      </div>
    </StoreLayout>
  );
}

function DeliveryForm() {
  const qc = useQueryClient();
  const save = useServerFn(adminUpdateDelivery);
  const { data } = useQuery(deliveryQuery);
  const [fee, setFee] = useState("");
  const [min, setMin] = useState("");
  const [hold, setHold] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setFee(String(data.shippingFee)); setMin(String(data.freeShippingMin)); setHold(String(data.payoutHoldDays ?? 7)); } }, [data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const shippingFee = Number(fee), freeShippingMin = Number(min), payoutHoldDays = Number(hold);
    if (![shippingFee, freeShippingMin, payoutHoldDays].every((n) => Number.isInteger(n) && n >= 0) || payoutHoldDays > 90) {
      toast.error("أدخل أرقامًا صحيحة"); return;
    }
    setBusy(true);
    try {
      await save({ data: { shippingFee, freeShippingMin, payoutHoldDays } });
      await qc.invalidateQueries({ queryKey: deliveryQuery.queryKey });
      toast.success("تم حفظ الإعدادات");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-5">
      <h2 className="w-full text-lg font-black">رسوم التوصيل ودفعات البائعين</h2>
      <label className="text-sm font-bold">رسوم التوصيل (ج.م)
        <input aria-label="رسوم التوصيل" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className="mt-1 block w-32 rounded-md border bg-background px-3 py-2" />
      </label>
      <label className="text-sm font-bold">توصيل مجاني من (ج.م)
        <input aria-label="الحد الأدنى للتوصيل المجاني" type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} className="mt-1 block w-32 rounded-md border bg-background px-3 py-2" />
      </label>
      <label className="text-sm font-bold">مدة انتظار أرباح البائع (أيام بعد التوصيل)
        <input aria-label="مدة انتظار الأرباح بالأيام" type="number" min={0} max={90} value={hold} onChange={(e) => setHold(e.target.value)} className="mt-1 block w-32 rounded-md border bg-background px-3 py-2" />
      </label>
      <Button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">حفظ</Button>
    </form>
  );
}

function OrdersPanel() {
  const qc = useQueryClient();
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const update = useServerFn(adminUpdateStatus);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const shown = orders.filter((o) => (filter === "all" || o.status === filter) &&
    `${o.id} ${o.full_name} ${o.phone} ${o.city}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  async function changeStatus(id: string, status: string) {
    try {
      await update({ data: { id, status } });
      await qc.invalidateQueries({ queryKey: adminOrdersQuery.queryKey });
      toast.success("تم تحديث حالة الطلب");
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <h2 className="text-lg font-black">الطلبات</h2>
        <label className="flex w-full items-center gap-2 rounded-md border bg-background px-3 sm:w-72">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input aria-label="البحث في الطلبات" placeholder="اسم العميل، الهاتف، رقم الطلب" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-black">الطلبات ({fmt(orders.length)})</h2>
        {["all", ...ORDER_STATUSES].map((s) => (
          <Button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-sm font-bold ${filter === s ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {s === "all" ? "الكل" : statusLabel[s]} <span className="text-xs">{fmt(s === "all" ? orders.length : orders.filter((o) => o.status === s).length)}</span>
          </Button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-lg bg-card py-12 text-center font-bold">لا توجد طلبات</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((o) => (
            <li key={o.id} className="rounded-lg bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div><span className="font-black">طلب #{o.id.slice(0, 8).toUpperCase()}</span> <span className="text-muted-foreground">· {new Date(o.created_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</span></div>
                <div className="flex flex-wrap items-center gap-2">
                {o.status === "pending" && <Button onClick={() => changeStatus(o.id, "shipped")} className="rounded-md bg-primary px-3 py-1 font-bold text-primary-foreground">تم الشحن</Button>}
                {o.status === "shipped" && <Button onClick={() => changeStatus(o.id, "delivered")} className="rounded-md bg-primary px-3 py-1 font-bold text-primary-foreground">تم التوصيل</Button>}
                <select aria-label="حالة الطلب" value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} className="rounded-md border bg-background px-2 py-1 font-bold">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
                </div>
              </div>
              <p className="py-2">{o.full_name} · <span dir="ltr">{o.phone}</span> · {o.city}، {o.address}{o.notes ? ` · ملاحظات: ${o.notes}` : ""}</p>
              <ul className="divide-y">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between py-1"><span>{it.name} × {fmt(it.qty)}</span><span>{fmt(it.price * it.qty)} ج.م</span></li>
                ))}
              </ul>
              <p className="border-t pt-2 text-left font-black">الإجمالي {fmt(o.total)} ج.م (توصيل {fmt(o.shipping)} ج.م){o.discount > 0 ? ` · خصم ${fmt(o.discount)} ج.م (${o.coupon_code})` : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const adminSections = [
  { id: "orders", label: "الطلبات", icon: Package },
  { id: "merchants", label: "البائعون", icon: Store },
  { id: "withdrawals", label: "طلبات السحب", icon: Wallet },
  { id: "coupons", label: "أكواد الخصم", icon: TicketPercent },
  { id: "settings", label: "الإعدادات", icon: Settings },
];

function AdminPage() {
  const qc = useQueryClient();
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const [refreshing, setRefreshing] = useState(false);
  const metrics = [
    { label: "إجمالي الطلبات", value: orders.length, icon: Package },
    { label: "قيد التجهيز", value: orders.filter((o) => o.status === "pending").length, icon: Store },
    { label: "في الطريق", value: orders.filter((o) => o.status === "shipped").length, icon: Truck },
    { label: "تم التوصيل", value: orders.filter((o) => o.status === "delivered").length, icon: CheckCheck },
  ];
  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all(["admin-orders", "admin-merchants", "admin-withdrawals", "admin-ledger", "coupons"].map((key) => qc.invalidateQueries({ queryKey: [key] })));
    } finally { setRefreshing(false); }
  }
  return (
    <StoreLayout>
      <header className="flex items-center justify-between gap-3 border-b pb-4">
        <div><p className="mb-1 text-xs font-bold text-muted-foreground">سين / الإدارة</p><h1 className="text-2xl font-black">لوحة الإدارة</h1></div>
        <Button variant="outline" size="icon" aria-label="تحديث البيانات" title="تحديث البيانات" disabled={refreshing} onClick={refresh}><RefreshCw className={refreshing ? "animate-spin" : ""} /></Button>
      </header>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-b pb-6 md:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => <div key={label} className="border-s-2 border-primary ps-3"><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="size-4 shrink-0" />{label}</dt><dd className="mt-2 text-2xl font-black">{fmt(value)}</dd></div>)}
      </dl>
      <Tabs defaultValue="orders" dir="rtl" className="grid min-w-0 gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
        <TabsList aria-label="أقسام الإدارة" className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b bg-transparent p-0 pb-3 lg:flex-col lg:items-stretch lg:self-start lg:border-b-0 lg:border-e lg:pe-3">
          {adminSections.map(({ id, label, icon: Icon }) => <TabsTrigger key={id} value={id} className="min-h-10 gap-2 px-3 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-none lg:justify-start"><Icon className="size-4 shrink-0" />{label}</TabsTrigger>)}
        </TabsList>
        <div className="min-w-0">
          <TabsContent value="orders" className="mt-0"><OrdersPanel /></TabsContent>
          <TabsContent value="merchants" className="mt-0"><MerchantsPanel /></TabsContent>
          <TabsContent value="withdrawals" className="mt-0"><WithdrawalsPanel /></TabsContent>
          <TabsContent value="coupons" className="mt-0"><CouponManager scope="store" /></TabsContent>
          <TabsContent value="settings" className="mt-0"><DeliveryForm /></TabsContent>
        </div>
      </Tabs>
    </StoreLayout>
  );
}

const merchantStatusLabel: Record<string, string> = { pending: "بانتظار الموافقة", approved: "معتمد", suspended: "موقوف" };

function MerchantsPanel() {
  const qc = useQueryClient();
  const list = useServerFn(adminListMerchants);
  const setStatus = useServerFn(adminSetMerchantStatus);
  const { data } = useQuery({ queryKey: ["admin-merchants"], queryFn: () => list() });
  async function change(id: string, status: string) {
    try {
      await setStatus({ data: { id, status } });
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-merchants"] }), qc.invalidateQueries({ queryKey: ["seller-products"] })]);
      toast.success("تم تحديث حالة البائع");
    } catch (err) { toast.error((err as Error).message); }
  }
  const [open, setOpen] = useState<string | null>(null);
  const pending = data?.filter((m) => m.status === "pending").length ?? 0;
  return (
    <section className="space-y-4">
      <h2 className="mb-2 text-lg font-black">البائعون {pending > 0 && <span className="rounded-full bg-destructive px-2 text-xs text-destructive-foreground">{fmt(pending)} جديد</span>}</h2>
      {!data?.length ? <p className="text-sm text-muted-foreground">لا يوجد بائعون بعد</p> : (
        <ul className="divide-y text-sm">
          {data.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div><span className="font-bold">{m.store_name}</span> <span className="text-xs text-muted-foreground" dir="ltr">/store/{m.slug}</span>
                {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{merchantStatusLabel[m.status]}</span>
                {m.status !== "approved" && <Button onClick={() => change(m.id, "approved")} className="rounded-md bg-primary px-3 py-1 font-bold text-primary-foreground">اعتماد</Button>}
                {m.status === "approved" && <Button onClick={() => change(m.id, "suspended")} className="rounded-md border px-3 py-1 font-bold text-destructive">إيقاف</Button>}
                <Button onClick={() => setOpen(open === m.id ? null : m.id)} className="rounded-md border px-3 py-1 font-bold">{open === m.id ? "إخفاء" : "العمولة والدفعات"}</Button>
              </div>
              {open === m.id && <MerchantLedger id={m.id} rate={Number(m.commission_rate)} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MerchantLedger({ id, rate }: { id: string; rate: number }) {
  const qc = useQueryClient();
  const load = useServerFn(adminMerchantLedger);
  const saveRate = useServerFn(adminSetCommission);
  const addPayout = useServerFn(adminAddPayout);
  const delPayout = useServerFn(adminDeletePayout);
  const key = ["admin-ledger", id];
  const { data } = useQuery({ queryKey: key, queryFn: () => load({ data: { id } }) });
  const [r, setR] = useState(String(rate));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { data: settings } = useQuery(deliveryQuery);
  const e = data ? sellerEarnings(data.lines, data.payouts, settings?.payoutHoldDays ?? 7) : null;
  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); await Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ["admin-merchants"] })]); toast.success(ok); }
    catch (err) { toast.error((err as Error).message); }
  }
  function onRate(ev: FormEvent) {
    ev.preventDefault();
    const n = Number(r);
    if (!Number.isFinite(n) || n < 0 || n > 100) { toast.error("العمولة بين ٠ و١٠٠٪"); return; }
    void run(() => saveRate({ data: { id, rate: n } }), "تم حفظ العمولة — تُطبّق على الطلبات الجديدة");
  }
  function onPay(ev: FormEvent) {
    ev.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) { toast.error("أدخل مبلغًا صحيحًا"); return; }
    if (e && n > e.balance) { toast.error("المبلغ أكبر من الرصيد المستحق"); return; }
    void run(async () => { await addPayout({ data: { id, amount: n, note } }); setAmount(""); setNote(""); }, "تم تسجيل الدفعة");
  }
  const box = "rounded-md border bg-background px-2 py-1";
  return (
    <div className="w-full space-y-4 border-t pt-4">
      <form onSubmit={onRate} className="flex flex-wrap items-center gap-2">
        <label className="font-bold">نسبة العمولة ٪</label>
        <input aria-label="نسبة العمولة" type="number" min={0} max={100} step="0.5" value={r} onChange={(x) => setR(x.target.value)} className={`${box} w-24`} />
        <Button className="rounded-md bg-secondary px-3 py-1 font-bold text-secondary-foreground">حفظ</Button>
      </form>
      {!e ? <p>جارٍ التحميل...</p> : (
        <>
          <p>مبيعات مُسلّمة {fmt(e.gross)} · عمولة {fmt(e.commission)} · صافي البائع {fmt(e.net)} · قيد الانتظار {fmt(e.held)} · مدفوع {fmt(e.paid)} · <b>المستحق {fmt(e.balance)} ج.م</b></p>
          <form onSubmit={onPay} className="flex flex-wrap items-center gap-2">
            <input aria-label="مبلغ الدفعة" type="number" min={1} step="0.01" placeholder="المبلغ" value={amount} onChange={(x) => setAmount(x.target.value)} className={`${box} w-28`} />
            <input aria-label="ملاحظة" placeholder="ملاحظة (مثلاً تحويل بنكي)" value={note} maxLength={200} onChange={(x) => setNote(x.target.value)} className={`${box} flex-1`} />
            <Button className="rounded-md bg-primary px-3 py-1 font-bold text-primary-foreground">تسجيل دفعة</Button>
          </form>
          {(data?.payouts.length ?? 0) > 0 && (
            <ul className="divide-y">{data?.payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-1">
                <span>{new Date(p.created_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })}{p.note ? ` · ${p.note}` : ""}</span>
                <span className="flex items-center gap-2 font-bold">{fmt(Number(p.amount))} ج.م
                  <Button onClick={() => { if (confirm("حذف هذه الدفعة؟")) void run(() => delPayout({ data: { id: p.id } }), "تم حذف الدفعة"); }} className="text-xs text-destructive">حذف</Button></span>
              </li>))}</ul>
          )}
        </>
      )}
    </div>
  );
}

const wLabel: Record<string, string> = { bank: "تحويل بنكي", instapay: "إنستاباي", wallet: "محفظة إلكترونية", pending: "قيد المراجعة", paid: "تم الدفع", rejected: "مرفوض" };

function WithdrawalsPanel() {
  const qc = useQueryClient();
  const load = useServerFn(adminListWithdrawals);
  const decide = useServerFn(adminDecideWithdrawal);
  const { data = [] } = useQuery({ queryKey: ["admin-withdrawals"], queryFn: () => load(), refetchInterval: 30_000 });
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? data : data.filter((w) => w.status === "pending");
  const [open, setOpen] = useState<{ id: string; decision: "paid" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  function start(id: string, decision: "paid" | "rejected") { setOpen({ id, decision }); setNote(""); }
  async function confirm(ev: FormEvent) {
    ev.preventDefault();
    if (!open) return;
    if (open.decision === "rejected" && note.trim().length < 3) { toast.error("اكتب سبب الرفض ليعرفه البائع"); return; }
    setBusy(true);
    try {
      await decide({ data: { id: open.id, decision: open.decision, note } });
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }), qc.invalidateQueries({ queryKey: ["admin-ledger"] })]);
      toast.success(open.decision === "paid" ? "تم تسجيل الدفع" : "تم رفض الطلب");
      setOpen(null);
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <section className="space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-black">طلبات السحب ({fmt(data.filter((w) => w.status === "pending").length)} بانتظار المراجعة)</h2>
        <Button onClick={() => setShowAll(!showAll)} className="text-sm font-bold text-accent">{showAll ? "المعلّقة فقط" : "عرض الكل"}</Button>
      </div>
      {shown.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد طلبات</p> : (
        <ul className="divide-y text-sm">{shown.map((w) => (
          <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <div className="font-bold">{w.merchants?.store_name} · {fmt(Number(w.amount))} ج.م · {wLabel[w.method]}</div>
              <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })} · {w.account_details}{w.admin_note ? ` · ${w.admin_note}` : ""}</div>
            </div>
            {w.status !== "pending" ? <span className="text-xs font-bold">{wLabel[w.status]}</span> : open?.id !== w.id ? (
              <span className="flex gap-2">
                <Button onClick={() => start(w.id, "paid")} className="rounded-md bg-primary px-3 py-1 font-bold text-primary-foreground">تم الدفع</Button>
                <Button onClick={() => start(w.id, "rejected")} className="rounded-md bg-muted px-3 py-1 font-bold text-destructive">رفض</Button>
              </span>
            ) : null}
            {open?.id === w.id && (
              <form onSubmit={confirm} className={`w-full space-y-2 rounded-md border-2 p-3 ${open.decision === "paid" ? "border-primary bg-muted" : "border-destructive bg-muted"}`}>
                <div className="font-bold">{open.decision === "paid" ? `تأكيد دفع ${fmt(Number(w.amount))} ج.م إلى ${w.merchants?.store_name ?? ""}` : "رفض طلب السحب"}</div>
                <p className="text-xs text-muted-foreground">{open.decision === "paid" ? `حوّل المبلغ أولًا عبر ${wLabel[w.method]} إلى: ${w.account_details}` : "سيظهر السبب للبائع في صفحة السحب."}</p>
                <input autoFocus aria-label={open.decision === "paid" ? "رقم التحويل" : "سبب الرفض"} maxLength={200} value={note} onChange={(x) => setNote(x.target.value)}
                  placeholder={open.decision === "paid" ? "رقم التحويل أو المرجع (اختياري)" : "مثلاً: بيانات الحساب غير صحيحة"} className="w-full rounded-md border bg-background px-3 py-2" />
                <div className="flex gap-2">
                  <Button disabled={busy} className={`rounded-md px-4 py-1.5 font-bold disabled:opacity-60 ${open.decision === "paid" ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>{busy ? "جارٍ..." : open.decision === "paid" ? "تأكيد الدفع" : "تأكيد الرفض"}</Button>
                  <Button type="button" onClick={() => setOpen(null)} className="rounded-md bg-card px-4 py-1.5 font-bold">إلغاء</Button>
                </div>
              </form>
            )}
          </li>))}</ul>
      )}
    </section>
  );
}
