import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { fmt } from "@/lib/catalog";
import { listMyOrders } from "@/lib/orders.functions";
import { StoreLayout } from "@/components/store/StoreLayout";

const ordersQuery = queryOptions({ queryKey: ["orders"], queryFn: () => listMyOrders(), refetchInterval: 20_000, refetchOnWindowFocus: true });
const statusLabel: Record<string, string> = { pending: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: zodValidator(z.object({ placed: z.string().optional() })),
  loader: ({ context }) => context.queryClient.ensureQueryData(ordersQuery),
  head: () => ({
    meta: [
      { title: "طلباتي | سين" },
      { name: "description", content: "تابع طلباتك السابقة وحالة التوصيل في سين." },
      { property: "og:title", content: "طلباتي | سين" },
      { property: "og:description", content: "كل طلباتك في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
  errorComponent: OrdersError,
  notFoundComponent: () => <StoreLayout><p className="py-16 text-center font-bold">لا توجد طلبات.</p></StoreLayout>,
});

function OrdersError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <StoreLayout>
      <div className="rounded-lg bg-card py-16 text-center">
        <p className="font-bold">تعذر تحميل طلباتك</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">حاول مرة أخرى</button>
      </div>
    </StoreLayout>
  );
}

function OrdersPage() {
  const { placed } = Route.useSearch();
  const { data: orders } = useSuspenseQuery(ordersQuery);
  return (
    <StoreLayout>
      {placed && (
        <div className="flex items-center gap-3 rounded-lg bg-success p-4 font-bold text-accent-foreground">
          <CheckCircle2 className="h-6 w-6" />تم تأكيد طلبك بنجاح! سنتواصل معك قبل التوصيل.
        </div>
      )}
      <h1 className="text-2xl font-black">طلباتي</h1>
      {orders.length === 0 ? (
        <div className="rounded-lg bg-card py-16 text-center">
          <p className="font-bold">لا توجد طلبات بعد</p>
          <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">ابدأ التسوق</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className={`rounded-lg bg-card p-4 ${o.id === placed ? "ring-2 ring-primary" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
                <div><span className="font-black">طلب #{o.id.slice(0, 8).toUpperCase()}</span> <span className="text-muted-foreground">· {new Date(o.created_at).toLocaleDateString("ar-EG", { dateStyle: "medium" })}</span></div>
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{statusLabel[o.status] ?? o.status}</span>
              </div>
              <StatusSteps status={o.status} />
              <ul className="divide-y py-2 text-sm">
                {o.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-3 py-1.5">
                    <Link to="/product/$id" params={{ id: it.id }} className="line-clamp-1 hover:text-accent">{it.name} × {fmt(it.qty)}</Link>
                    <span className="whitespace-nowrap">{fmt(it.price * it.qty)} ج.م</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap justify-between gap-2 border-t pt-2 text-sm">
                <span className="text-muted-foreground">{o.full_name} · {o.city}، {o.address}</span>
                <span className="font-black">الإجمالي {fmt(o.total)} ج.م {o.shipping === 0 ? "(توصيل مجاني)" : `(شامل توصيل ${fmt(o.shipping)} ج.م)`}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </StoreLayout>
  );
}

const STEPS = ["pending", "shipped", "delivered"] as const;
function StatusSteps({ status }: { status: string }) {
  if (status === "cancelled") return <p className="py-2 text-sm font-bold text-destructive">تم إلغاء هذا الطلب</p>;
  const at = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="flex gap-2 py-3" aria-label="مراحل الطلب">
      {STEPS.map((s, i) => (
        <li key={s} className="flex-1 text-center text-xs font-bold">
          <div className={`mb-1 h-1.5 rounded-full ${i <= at ? "bg-primary" : "bg-muted"}`} />
          <span className={i <= at ? "" : "text-muted-foreground"}>{statusLabel[s]}</span>
        </li>
      ))}
    </ol>
  );
}
