import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { fmt } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { MAX_QTY } from "@/lib/pricing";
import { StoreLayout } from "@/components/store/StoreLayout";
import { OrderSummary } from "@/components/store/OrderSummary";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "عربة التسوق | سين" },
      { name: "description", content: "راجع المنتجات في عربتك وأكمل الطلب بالدفع عند الاستلام." },
      { property: "og:title", content: "عربة التسوق | سين" },
      { property: "og:description", content: "راجع عربتك وأكمل الطلب على سين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { lines, count, totals, setQty, remove } = useCart();
  if (lines.length === 0) {
    return (
      <StoreLayout>
        <div className="rounded-lg bg-card py-16 text-center">
          <h1 className="text-xl font-black">عربتك فارغة</h1>
          <p className="mt-1 text-sm text-muted-foreground">تصفح العروض وأضف ما يعجبك.</p>
          <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">ابدأ التسوق</Link>
        </div>
      </StoreLayout>
    );
  }
  return (
    <StoreLayout>
      <h1 className="text-2xl font-black">عربة التسوق <span className="text-sm font-semibold text-muted-foreground">({fmt(count)} قطعة)</span></h1>
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <ul className="space-y-3">
          {lines.map(({ product: p, qty }) => (
            <li key={p.id} className="flex gap-4 rounded-lg bg-card p-3">
              <Link to="/product/$id" params={{ id: p.id }}><img src={p.img} alt={p.name} loading="lazy" width={816} height={816} className="h-24 w-24 rounded bg-muted object-contain" /></Link>
              <div className="flex flex-1 flex-col gap-2">
                <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-2 text-sm font-semibold">{p.name}</Link>
                <div className="font-black">{fmt(p.price)} ج.م</div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-md border">
                    <button aria-label="تقليل الكمية" disabled={qty <= 1} onClick={() => setQty(p.id, qty - 1)} className="p-1.5 disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-bold">{fmt(qty)}</span>
                    <button aria-label="زيادة الكمية" disabled={qty >= MAX_QTY} onClick={() => setQty(p.id, qty + 1)} className="p-1.5 disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button onClick={() => remove(p.id)} className="flex items-center gap-1 text-xs font-bold text-destructive"><Trash2 className="h-3.5 w-3.5" />حذف</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <OrderSummary {...totals}>
          <Link to="/checkout" className="block w-full rounded-md bg-primary py-2.5 text-center font-black text-primary-foreground">إتمام الشراء</Link>
        </OrderSummary>
      </div>
    </StoreLayout>
  );
}
