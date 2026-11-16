import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Heart, Minus, Plus, ShieldCheck, Star, Truck } from "lucide-react";
import { toast } from "sonner";
import { discountPercent, fmt, getCategory, getProduct, isSellerProductId, productsInCategory } from "@/lib/catalog";
import { getSellerProduct } from "@/lib/market.functions";
import { Store } from "lucide-react";
import { useCart } from "@/lib/cart";
import { MAX_QTY } from "@/lib/pricing";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductGrid } from "@/components/store/ProductCard";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const product = getProduct(params.id) ?? (isSellerProductId(params.id) ? await getSellerProduct({ data: { id: params.id } }) : null);
    if (!product) throw notFound();
    return { product, category: getCategory(product.category) };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    const title = p ? `${p.name} | سين` : "منتج غير متاح | سين";
    const description = p ? `${p.description} السعر ${fmt(p.price)} ج.م.` : "هذا المنتج غير متاح.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary" },
        ...(p ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <StoreLayout>
      <div className="rounded-lg bg-card py-16 text-center">
        <p className="text-lg font-bold">هذا المنتج غير متاح</p>
        <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">العودة للرئيسية</Link>
      </div>
    </StoreLayout>
  ),
  errorComponent: () => <StoreLayout><p className="py-16 text-center font-bold">تعذر تحميل المنتج.</p></StoreLayout>,
});

function ProductPage() {
  const { product: p, category } = Route.useLoaderData();
  const { add, favorites, toggleFavorite } = useCart();
  const [qty, setQty] = useState(1);
  const liked = favorites.includes(p.id);
  const maxQty = Math.min(MAX_QTY, p.stock ?? MAX_QTY);
  const soldOut = p.stock === 0;
  const related = productsInCategory(p.category).filter((x) => x.id !== p.id).slice(0, 5);

  return (
    <StoreLayout>
      <nav className="text-xs text-muted-foreground">
        <Link to="/">الرئيسية</Link> / {category && <><Link to="/category/$slug" params={{ slug: category.slug }}>{category.name}</Link> / </>}
        <span className="text-foreground">{p.name}</span>
      </nav>
      <section className="grid gap-6 rounded-lg bg-card p-4 md:grid-cols-[1fr_1.2fr_0.8fr]">
        <Gallery key={p.id} images={p.images?.length ? p.images : [p.img]} alt={p.name} />
        <div className="space-y-3">
          <div className="text-sm font-bold text-accent">{p.brand}</div>
          {p.seller && <Link to="/store/$slug" params={{ slug: p.seller.slug }} className="flex w-fit items-center gap-1 text-sm font-bold hover:text-accent"><Store className="h-4 w-4" />يبيعه: {p.seller.name}</Link>}
          <h1 className="text-2xl font-black leading-snug">{p.name}</h1>
          {p.reviews > 0 && <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-0.5 rounded bg-success px-1.5 font-bold text-accent-foreground">{fmt(p.rating)}<Star className="h-3.5 w-3.5 fill-current" /></span>
            <span className="text-muted-foreground">{fmt(p.reviews)} تقييم</span>
          </div>}
          <div className="border-y py-3">
            <div className="text-3xl font-black">{fmt(p.price)} <span className="text-base font-semibold">ج.م</span></div>
            {p.oldPrice > p.price && <div className="mt-1 flex gap-2 text-sm"><s className="text-muted-foreground">{fmt(p.oldPrice)} ج.م</s><span className="font-bold text-success">وفّر {fmt(p.oldPrice - p.price)} ج.م (خصم {fmt(discountPercent(p))}٪)</span></div>}
          </div>
          <p className="text-sm leading-relaxed">{p.description}</p>
          <ul className="space-y-1.5 text-sm">
            {p.highlights.map((h) => <li key={h} className="flex items-center gap-2"><Check className="h-4 w-4 text-success" />{h}</li>)}
          </ul>
        </div>
        <aside className="h-fit space-y-4 rounded-lg border p-4">
          {p.express && <span className="inline-block rounded bg-primary px-2 text-xs font-black italic">سريع ⚡ يصلك غدًا</span>}
          <div className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-accent" />توصيل مجاني للطلبات فوق ٢٠٠ ج.م</div>
          <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-accent" />إرجاع مجاني خلال ١٤ يوم</div>
          <div className="flex items-center justify-between rounded-md border">
            <button aria-label="تقليل الكمية" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2"><Minus className="h-4 w-4" /></button>
            <span className="font-bold" aria-live="polite">{fmt(qty)}</span>
            <button aria-label="زيادة الكمية" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="p-2"><Plus className="h-4 w-4" /></button>
          </div>
          {p.stock !== undefined && <p className={`text-sm font-bold ${soldOut ? "text-destructive" : "text-success"}`}>{soldOut ? "نفدت الكمية" : `متوفر: ${fmt(p.stock)} قطعة`}</p>}
          <button disabled={soldOut} onClick={() => { add(p.id, qty); toast.success("تمت الإضافة إلى العربة"); }} className="w-full rounded-md bg-secondary py-2.5 font-bold text-secondary-foreground hover:bg-accent disabled:opacity-50">أضف إلى العربة</button>
          <button onClick={() => toggleFavorite(p.id)} className="flex w-full items-center justify-center gap-2 rounded-md border py-2 text-sm font-bold">
            <Heart className={`h-4 w-4 ${liked ? "fill-destructive text-destructive" : ""}`} />{liked ? "في المفضلة" : "أضف للمفضلة"}
          </button>
        </aside>
      </section>
      {related.length > 0 && (
        <section className="rounded-lg bg-card p-4">
          <h2 className="mb-3 text-xl font-black">منتجات مشابهة</h2>
          <ProductGrid items={related} />
        </section>
      )}
    </StoreLayout>
  );
}

function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <img src={images[i] ?? images[0]} alt={alt} width={816} height={816} className="aspect-square w-full rounded-lg bg-muted object-contain" />
      {images.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((src, j) => (
            <button key={src} type="button" aria-label={`صورة ${j + 1}`} onClick={() => setI(j)} className={`h-16 w-16 overflow-hidden rounded border-2 ${j === i ? "border-primary" : "border-transparent"}`}>
              <img src={src} alt="" className="h-full w-full bg-muted object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
