import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Dumbbell, Gamepad2, Headphones, Home, Laptop, Shirt, Smartphone, Truck, Watch, type LucideIcon } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { categories, discountPercent, products } from "@/lib/catalog";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductGrid } from "@/components/store/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سين | تسوق أونلاين للإلكترونيات والموضة في مصر" },
      { name: "description", content: "تسوق أفضل العروض على الموبايلات والإلكترونيات والموضة والمنزل مع توصيل سريع في مصر من سين." },
      { property: "og:title", content: "سين | تسوق أونلاين في مصر" },
      { property: "og:description", content: "عروض يومية وتوصيل سريع على ملايين المنتجات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const icons: Record<string, LucideIcon> = {
  mobiles: Smartphone, laptops: Laptop, audio: Headphones, watches: Watch, fashion: Shirt, sports: Dumbbell, home: Home, gaming: Gamepad2,
};
const deals = [...products].sort((a, b) => discountPercent(b) - discountPercent(a)).slice(0, 5);
const best = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 5);

function Index() {
  return (
    <StoreLayout>
      <section className="relative overflow-hidden rounded-lg">
        <img src={hero} alt="عروض سين" width={1600} height={640} className="h-56 w-full object-cover md:h-80" />
        <div className="absolute inset-y-0 right-0 flex flex-col justify-center gap-3 bg-gradient-to-l from-secondary/85 to-transparent p-8 text-secondary-foreground md:w-1/2">
          <span className="w-fit rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">الجمعة البيضاء</span>
          <h1 className="text-3xl font-black md:text-5xl">خصومات تصل إلى ٤٠٪</h1>
          <p className="text-sm md:text-base">على الموبايلات والإلكترونيات والموضة</p>
          <Link to="/search" search={{ q: "", sort: "discount" }} className="w-fit rounded-md bg-primary px-5 py-2 font-bold text-primary-foreground">تسوق الآن</Link>
        </div>
      </section>

      <section className="grid grid-cols-4 gap-3 rounded-lg bg-card p-4 md:grid-cols-8">
        {categories.map((c) => {
          const I = icons[c.slug] ?? Smartphone;
          return (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className="group flex flex-col items-center gap-2 text-center text-xs font-semibold">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted transition group-hover:bg-primary"><I className="h-7 w-7" /></span>{c.name}
            </Link>
          );
        })}
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {["توصيل مجاني للطلبات فوق ٢٠٠ ج.م", "ادفع عند الاستلام", "إرجاع مجاني خلال ١٤ يوم"].map((t) => (
          <div key={t} className="flex items-center gap-3 rounded-lg bg-secondary p-4 text-sm font-bold text-secondary-foreground"><Truck className="h-5 w-5 text-primary" />{t}</div>
        ))}
      </div>

      <Row title="عروض اليوم" sort="discount" items={deals} />
      <Row title="الأكثر مبيعًا" sort="popular" items={best} />
    </StoreLayout>
  );
}

function Row({ title, items, sort }: { title: string; items: typeof products; sort: "discount" | "popular" }) {
  return (
    <section className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">{title}</h2>
        <Link to="/search" search={{ q: "", sort }} className="flex items-center text-sm font-bold text-accent">عرض الكل<ChevronLeft className="h-4 w-4" /></Link>
      </div>
      <ProductGrid items={items} />
    </section>
  );
}
