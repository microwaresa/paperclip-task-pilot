import type { ReactNode } from "react";
import { fmt } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function OrderSummary({ subtotal, shipping, total, children }: { subtotal: number; shipping: number; total: number; children?: ReactNode }) {
  const { freeShippingMin } = useCart();
  return (
    <aside className="h-fit space-y-3 rounded-lg bg-card p-4">
      <h2 className="text-lg font-black">ملخص الطلب</h2>
      <div className="flex justify-between text-sm"><span>المجموع الفرعي</span><span>{fmt(subtotal)} ج.م</span></div>
      <div className="flex justify-between text-sm"><span>التوصيل</span><span className={shipping === 0 ? "font-bold text-success" : ""}>{shipping === 0 ? "مجاني" : `${fmt(shipping)} ج.م`}</span></div>
      {shipping > 0 && <p className="text-xs text-muted-foreground">أضف {fmt(freeShippingMin - subtotal)} ج.م للحصول على توصيل مجاني.</p>}
      <div className="flex justify-between border-t pt-3 text-lg font-black"><span>الإجمالي</span><span>{fmt(total)} ج.م</span></div>
      {children}
    </aside>
  );
}
