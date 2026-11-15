import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ShoppingCart, Heart, User, MapPin, Star, Truck, Smartphone, Laptop, Shirt, Home, Sparkles, Baby, Dumbbell, Tv, Gamepad2, Watch, ChevronLeft } from "lucide-react";
import hero from "@/assets/hero.jpg";
import headphones from "@/assets/p-headphones.jpg";
import phone from "@/assets/p-phone.jpg";
import sneakers from "@/assets/p-sneakers.jpg";

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

const nav = ["الإلكترونيات", "الموبايلات", "الموضة النسائية", "الموضة الرجالي", "المنزل والمطبخ", "الجمال", "الأطفال", "الرياضة", "البقالة", "العروض"];
const cats = [
  { n: "موبايلات", i: Smartphone }, { n: "لابتوب", i: Laptop }, { n: "موضة", i: Shirt }, { n: "المنزل", i: Home },
  { n: "جمال", i: Sparkles }, { n: "أطفال", i: Baby }, { n: "رياضة", i: Dumbbell }, { n: "تلفزيونات", i: Tv },
  { n: "ألعاب", i: Gamepad2 }, { n: "ساعات", i: Watch },
];
const imgs = [phone, headphones, sneakers];
const names = ["آيفون 16 برو ماكس 256 جيجا تيتانيوم أسود", "سماعة رأس لاسلكية بخاصية إلغاء الضوضاء", "حذاء جري رياضي خفيف للرجال أبيض", "سامسونج جالاكسي S25 ألترا 512 جيجا", "سماعة بلوتوث بعمر بطارية 40 ساعة", "كوتشي رياضي مريح للمشي", ];
const products = Array.from({ length: 12 }, (_, k) => {
  const price = [64999, 2499, 1899, 54999, 1299, 1499][k % 6];
  const off = [12, 35, 20, 18, 40, 25][k % 6];
  return { id: k, name: names[k % 6], img: imgs[k % 3], price, old: Math.round(price / (1 - off / 100)), off, rating: (4 + (k % 9) / 10).toFixed(1), reviews: 120 + k * 37, express: k % 2 === 0 };
});
const fmt = (n: number) => n.toLocaleString("ar-EG");

function Index() {
  const [cart, setCart] = useState(0);
  const [liked, setLiked] = useState<number[]>([]);
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <a href="/" className="text-3xl font-black tracking-tight">سين<span className="text-accent">.</span></a>
          <div className="hidden items-center gap-1 text-xs md:flex">
            <MapPin className="h-4 w-4" />
            <div><div className="text-muted-foreground">التوصيل إلى</div><div className="font-bold">القاهرة</div></div>
          </div>
          <div className="flex flex-1 items-center rounded-md bg-card px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input placeholder="عن ماذا تبحث؟" className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground outline-none" />
          </div>
          <button className="hidden items-center gap-1 text-sm font-semibold sm:flex"><User className="h-5 w-5" />تسجيل الدخول</button>
          <button aria-label="المفضلة" className="relative"><Heart className="h-6 w-6" />{liked.length > 0 && <Badge n={liked.length} />}</button>
          <button aria-label="العربة" className="relative"><ShoppingCart className="h-6 w-6" />{cart > 0 && <Badge n={cart} />}</button>
        </div>
        <nav className="border-t border-primary-foreground/10 bg-card text-foreground">
          <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-2 text-sm font-semibold">
            {nav.map((n) => <a key={n} href="#" className="whitespace-nowrap hover:text-accent">{n}</a>)}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-4">
        <section className="relative overflow-hidden rounded-lg">
          <img src={hero} alt="عروض سين" width={1600} height={640} className="h-56 w-full object-cover md:h-80" />
          <div className="absolute inset-y-0 right-0 flex flex-col justify-center gap-3 bg-gradient-to-l from-secondary/85 to-transparent p-8 text-secondary-foreground md:w-1/2">
            <span className="w-fit rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">الجمعة البيضاء</span>
            <h1 className="text-3xl font-black md:text-5xl">خصومات تصل إلى ٧٠٪</h1>
            <p className="text-sm md:text-base">على الموبايلات والإلكترونيات والموضة</p>
            <button className="w-fit rounded-md bg-primary px-5 py-2 font-bold text-primary-foreground">تسوق الآن</button>
          </div>
        </section>

        <section className="grid grid-cols-5 gap-3 rounded-lg bg-card p-4 md:grid-cols-10">
          {cats.map(({ n, i: I }) => (
            <a key={n} href="#" className="group flex flex-col items-center gap-2 text-center text-xs font-semibold">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted transition group-hover:bg-primary"><I className="h-7 w-7" /></span>{n}
            </a>
          ))}
        </section>

        <div className="grid gap-3 md:grid-cols-3">
          {["توصيل مجاني للطلبات فوق ٢٠٠ ج.م", "ادفع عند الاستلام", "إرجاع مجاني خلال ١٤ يوم"].map((t) => (
            <div key={t} className="flex items-center gap-3 rounded-lg bg-secondary p-4 text-sm font-bold text-secondary-foreground"><Truck className="h-5 w-5 text-primary" />{t}</div>
          ))}
        </div>

        <Row title="عروض اليوم" items={products.slice(0, 6)} {...{ setCart, liked, setLiked }} />
        <Row title="الأكثر مبيعًا في الإلكترونيات" items={products.slice(6)} {...{ setCart, liked, setLiked }} />
      </main>

      <footer className="mt-10 bg-secondary text-secondary-foreground">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm md:grid-cols-4">
          <div><div className="text-3xl font-black text-primary">سين</div><p className="mt-2 opacity-70">وجهتك الأولى للتسوق أونلاين في مصر.</p></div>
          {[["الأقسام", ["إلكترونيات", "موضة", "المنزل", "الجمال"]], ["المساعدة", ["مركز المساعدة", "الشحن", "الإرجاع"]], ["عن سين", ["من نحن", "الوظائف", "بيع على سين"]]].map(([h, l]) => (
            <div key={h as string}><div className="mb-2 font-bold">{h as string}</div>{(l as string[]).map((x) => <div key={x} className="py-0.5 opacity-70">{x}</div>)}</div>
          ))}
        </div>
        <div className="border-t border-secondary-foreground/10 py-4 text-center text-xs opacity-60">© ٢٠٢٦ سين. جميع الحقوق محفوظة.</div>
      </footer>
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return <span className="absolute -top-2 -left-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-secondary-foreground">{fmt(n)}</span>;
}

type P = (typeof products)[number];
function Row({ title, items, setCart, liked, setLiked }: { title: string; items: P[]; setCart: (f: (n: number) => number) => void; liked: number[]; setLiked: (f: (l: number[]) => number[]) => void }) {
  return (
    <section className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">{title}</h2>
        <a href="#" className="flex items-center text-sm font-bold text-accent">عرض الكل<ChevronLeft className="h-4 w-4" /></a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((p) => (
          <article key={p.id} className="group relative flex flex-col rounded-lg border p-2 transition hover:shadow-lg">
            <button aria-label="أضف للمفضلة" onClick={() => setLiked((l) => (l.includes(p.id) ? l.filter((x) => x !== p.id) : [...l, p.id]))} className="absolute top-3 left-3 z-10 rounded-full bg-card p-1.5 shadow">
              <Heart className={`h-4 w-4 ${liked.includes(p.id) ? "fill-destructive text-destructive" : ""}`} />
            </button>
            <img src={p.img} alt={p.name} loading="lazy" width={816} height={816} className="aspect-square w-full rounded bg-muted object-contain" />
            <h3 className="mt-2 line-clamp-2 text-sm">{p.name}</h3>
            <div className="mt-1 flex items-center gap-1 text-xs"><span className="flex items-center gap-0.5 rounded bg-success px-1 font-bold text-accent-foreground">{p.rating}<Star className="h-3 w-3 fill-current" /></span><span className="text-muted-foreground">({fmt(p.reviews)})</span></div>
            <div className="mt-1 font-black">{fmt(p.price)} <span className="text-xs font-semibold">ج.م</span></div>
            <div className="flex gap-2 text-xs"><s className="text-muted-foreground">{fmt(p.old)}</s><span className="font-bold text-success">خصم {fmt(p.off)}٪</span></div>
            {p.express && <span className="mt-1 w-fit rounded bg-primary px-1.5 text-[10px] font-black italic">سريع ⚡</span>}
            <button onClick={() => setCart((n) => n + 1)} className="mt-2 rounded-md bg-secondary py-1.5 text-xs font-bold text-secondary-foreground opacity-90 hover:bg-accent">أضف إلى العربة</button>
          </article>
        ))}
      </div>
    </section>
  );
}
