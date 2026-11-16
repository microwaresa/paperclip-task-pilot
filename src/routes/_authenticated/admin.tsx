import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { fmt } from "@/lib/catalog";
import { adminListOrders, adminUpdateDelivery, adminUpdateStatus, ORDER_STATUSES } from "@/lib/admin.functions";
import { deliveryQuery } from "@/lib/settings.functions";
import { StoreLayout } from "@/components/store/StoreLayout";

const adminOrdersQuery = queryOptions({ queryKey: ["admin-orders"], queryFn: () => adminListOrders() });
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
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">حاول مرة أخرى</button>
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
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) { setFee(String(data.shippingFee)); setMin(String(data.freeShippingMin)); } }, [data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const shippingFee = Number(fee), freeShippingMin = Number(min);
    if (!Number.isInteger(shippingFee) || !Number.isInteger(freeShippingMin) || shippingFee < 0 || freeShippingMin < 0) {
      toast.error("أدخل أرقامًا صحيحة"); return;
    }
    setBusy(true);
    try {
      await save({ data: { shippingFee, freeShippingMin } });
      await qc.invalidateQueries({ queryKey: deliveryQuery.queryKey });
      toast.success("تم حفظ رسوم التوصيل");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-lg bg-card p-4">
      <h2 className="w-full text-lg font-black">رسوم التوصيل</h2>
      <label className="text-sm font-bold">رسوم التوصيل (ج.م)
        <input aria-label="رسوم التوصيل" type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className="mt-1 block w-32 rounded-md border bg-background px-3 py-2" />
      </label>
      <label className="text-sm font-bold">توصيل مجاني من (ج.م)
        <input aria-label="الحد الأدنى للتوصيل المجاني" type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} className="mt-1 block w-32 rounded-md border bg-background px-3 py-2" />
      </label>
      <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">حفظ</button>
    </form>
  );
}

function AdminPage() {
  const qc = useQueryClient();
  const { data: orders } = useSuspenseQuery(adminOrdersQuery);
  const update = useServerFn(adminUpdateStatus);
  const [filter, setFilter] = useState<string>("all");
  const shown = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  async function changeStatus(id: string, status: string) {
    try {
      await update({ data: { id, status } });
      await qc.invalidateQueries({ queryKey: adminOrdersQuery.queryKey });
      toast.success("تم تحديث حالة الطلب");
    } catch (err) { toast.error((err as Error).message); }
  }

  return (
    <StoreLayout>
      <h1 className="text-2xl font-black">لوحة الإدارة</h1>
      <DeliveryForm />
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-black">الطلبات ({fmt(orders.length)})</h2>
        {["all", ...ORDER_STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-sm font-bold ${filter === s ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            {s === "all" ? "الكل" : statusLabel[s]}
          </button>
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
                <select aria-label="حالة الطلب" value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} className="rounded-md border bg-background px-2 py-1 font-bold">
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              </div>
              <p className="py-2">{o.full_name} · <span dir="ltr">{o.phone}</span> · {o.city}، {o.address}{o.notes ? ` · ملاحظات: ${o.notes}` : ""}</p>
              <ul className="divide-y">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between py-1"><span>{it.name} × {fmt(it.qty)}</span><span>{fmt(it.price * it.qty)} ج.م</span></li>
                ))}
              </ul>
              <p className="border-t pt-2 text-left font-black">الإجمالي {fmt(o.total)} ج.م (توصيل {fmt(o.shipping)} ج.م)</p>
            </li>
          ))}
        </ul>
      )}
    </StoreLayout>
  );
}
