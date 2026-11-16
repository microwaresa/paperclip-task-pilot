import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Banknote } from "lucide-react";
import { fmt } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { placeOrder } from "@/lib/orders.functions";
import { StoreLayout } from "@/components/store/StoreLayout";
import { OrderSummary } from "@/components/store/OrderSummary";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "إتمام الشراء | سين" },
      { name: "description", content: "أدخل عنوان التوصيل وأكد طلبك بالدفع عند الاستلام." },
      { property: "og:title", content: "إتمام الشراء | سين" },
      { property: "og:description", content: "أكد طلبك على سين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const cities = ["القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الشرقية", "الدقهلية", "الغربية", "المنوفية", "البحيرة", "بورسعيد", "السويس", "الإسماعيلية", "أسيوط", "سوهاج", "المنيا", "الأقصر", "أسوان"];

function CheckoutPage() {
  const { lines, totals, clear } = useCart();
  const send = useServerFn(placeOrder);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", city: "القاهرة", address: "", notes: "" });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (lines.length === 0) {
    return (
      <StoreLayout>
        <div className="rounded-lg bg-card py-16 text-center">
          <p className="font-bold">عربتك فارغة</p>
          <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">ابدأ التسوق</Link>
        </div>
      </StoreLayout>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) {
      toast.error("أدخل رقم موبايل مصري صحيح مثل 01012345678");
      return;
    }
    setBusy(true);
    try {
      const { id } = await send({ data: { ...form, items: lines.map((l) => ({ id: l.id, qty: l.qty })) } });
      clear();
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate({ to: "/orders", search: { placed: id } });
    } catch {
      toast.error("تعذر إتمام الطلب، راجع البيانات وحاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  const input = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
  return (
    <StoreLayout>
      <h1 className="text-2xl font-black">إتمام الشراء</h1>
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-lg bg-card p-4">
            <h2 className="text-lg font-black">عنوان التوصيل</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">الاسم بالكامل<input required minLength={2} maxLength={100} value={form.fullName} onChange={set("fullName")} className={input} /></label>
              <label className="text-sm font-semibold">رقم الموبايل<input required inputMode="tel" dir="ltr" placeholder="01012345678" value={form.phone} onChange={set("phone")} className={input} /></label>
              <label className="text-sm font-semibold">المحافظة
                <select value={form.city} onChange={set("city")} className={input}>{cities.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <label className="text-sm font-semibold sm:col-span-2">العنوان بالتفصيل<input required minLength={5} maxLength={300} placeholder="الشارع، رقم العمارة، الدور، الشقة" value={form.address} onChange={set("address")} className={input} /></label>
              <label className="text-sm font-semibold sm:col-span-2">ملاحظات (اختياري)<textarea maxLength={500} rows={2} value={form.notes} onChange={set("notes")} className={input} /></label>
            </div>
          </section>
          <section className="rounded-lg bg-card p-4">
            <h2 className="mb-2 text-lg font-black">طريقة الدفع</h2>
            <div className="flex items-center gap-3 rounded-md border-2 border-primary p-3 text-sm font-bold"><Banknote className="h-5 w-5" />الدفع نقدًا عند الاستلام</div>
          </section>
          <section className="rounded-lg bg-card p-4">
            <h2 className="mb-2 text-lg font-black">المنتجات</h2>
            <ul className="divide-y text-sm">
              {lines.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2"><span className="line-clamp-1">{l.product.name} × {fmt(l.qty)}</span><span className="whitespace-nowrap font-bold">{fmt(l.product.price * l.qty)} ج.م</span></li>)}
            </ul>
          </section>
        </div>
        <OrderSummary {...totals}>
          <button disabled={busy} className="w-full rounded-md bg-primary py-2.5 font-black text-primary-foreground disabled:opacity-60">{busy ? "جارٍ تأكيد الطلب..." : "تأكيد الطلب"}</button>
        </OrderSummary>
      </form>
    </StoreLayout>
  );
}
