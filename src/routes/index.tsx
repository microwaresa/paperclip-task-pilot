import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Dumbbell, Gamepad2, Headphones, Home, Laptop, Shirt, Smartphone, Truck, Watch, type LucideIcon } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { categories, discountPercent, products } from "@/lib/catalog";
import { StoreLayout } from "@/components/store/StoreLayout";
import { HeroCarousel, ProductCarousel, type Slide } from "@/components/store/Carousels";
import { clearViewed, suggest, useRecentlyViewed } from "@/lib/recently-viewed";
import slideElectronics from "@/assets/slide-electronics.jpg";
import slideHome from "@/assets/slide-home.jpg";

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
const deals = [...products].sort((a, b) => discountPercent(b) - discountPercent(a)).slice(0, 10);
const best = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 10);
const shopNow = (sort: "discount" | "popular", q = "") => <Link to="/search" search={{ q, sort }} className="w-fit rounded-md bg-primary px-5 py-2 font-bold text-primary-foreground">تسوق الآن</Link>;
const slides: Slide[] = [
  { img: hero, badge: "الجمعة البيضاء", title: "خصومات تصل إلى ٤٠٪", text: "على الموبايلات والإلكترونيات والموضة", cta: shopNow("discount") },
  { img: slideElectronics, badge: "جديد الإلكترونيات", title: "أحدث الأجهزة بأفضل سعر", text: "موبايلات وسماعات وساعات ذكية مع توصيل سريع", cta: shopNow("popular") },
  { img: slideHome, badge: "بيتك أحلى", title: "مستلزمات المنزل والمطبخ", text: "اختيارات مميزة من بائعي سين", cta: <Link to="/category/$slug" params={{ slug: "home" }} className="w-fit rounded-md bg-primary px-5 py-2 font-bold text-primary-foreground">تسوق الآن</Link> },
];

function Index() {
  return (
    <StoreLayout>
      <HeroCarousel slides={slides} />

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

      <ForYou />
      <ProductCarousel title="عروض اليوم" items={deals} action={<ViewAll sort="discount" />} />
      <ProductCarousel title="الأكثر مبيعًا" items={best} action={<ViewAll sort="popular" />} />
      <RecentlyViewed />
    </StoreLayout>
  );
}

function ViewAll({ sort }: { sort: "discount" | "popular" }) {
  return <Link to="/search" search={{ q: "", sort }} className="flex items-center text-sm font-bold text-accent">عرض الكل<ChevronLeft className="h-4 w-4" /></Link>;
}

/** "You may like" — based on what this shopper opened before (stored in their browser). */
function ForYou() {
  const viewed = useRecentlyViewed();
  const picks = suggest(viewed, products);
  return <ProductCarousel title="قد يعجبك أيضًا" items={picks} action={<span className="text-xs text-muted-foreground">بناءً على ما شاهدته</span>} />;
}

function RecentlyViewed() {
  const viewed = useRecentlyViewed();
  return <ProductCarousel title="شاهدتها مؤخرًا" items={viewed} action={<button onClick={clearViewed} className="text-sm font-bold text-accent">مسح السجل</button>} />;
}
