import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, PackagePlus, Store, Truck } from "lucide-react";
import { StoreLayout } from "@/components/store/StoreLayout";

export const Route = createFileRoute("/sell")({
  head: () => ({
    meta: [
      { title: "بِع على سين | افتح متجرك أونلاين" },
      { name: "description", content: "افتح متجرك على سين، أضف منتجاتك، استلم الطلبات وتابع مبيعاتك من لوحة واحدة." },
      { property: "og:title", content: "بِع على سين" },
      { property: "og:description", content: "افتح متجرك على سين ووصل لعملاء في كل مصر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SellPage,
});

const steps = [
  { icon: Store, t: "سجّل متجرك", d: "اختر اسم المتجر ورابطه، وتراجع الإدارة طلبك." },
  { icon: PackagePlus, t: "أضف منتجاتك", d: "صور وأسعار وكميات متاحة، وتظهر فورًا للمتسوقين." },
  { icon: Truck, t: "اشحن الطلبات", d: "تابع كل طلب وعنوان العميل، وحدّث حالته بضغطة." },
  { icon: BarChart3, t: "تابع مبيعاتك", d: "ملخص المبيعات المسلّمة والجارية وأكثر منتجاتك مبيعًا." },
];

function SellPage() {
  return (
    <StoreLayout>
      <section className="rounded-lg bg-secondary p-8 text-secondary-foreground">
        <h1 className="text-3xl font-black">بِع على سين<span className="text-primary">.</span></h1>
        <p className="mt-2 max-w-xl opacity-90">افتح متجرك واوصل لآلاف المتسوقين في كل محافظات مصر. الدفع عند الاستلام والتوصيل علينا.</p>
        <Link to="/merchant" className="mt-6 inline-block rounded-md bg-primary px-6 py-3 font-black text-primary-foreground">ابدأ البيع الآن</Link>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.t} className="rounded-lg bg-card p-4">
            <s.icon className="h-8 w-8 text-accent" />
            <h2 className="mt-2 font-black">{i + 1}. {s.t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </section>
    </StoreLayout>
  );
}
