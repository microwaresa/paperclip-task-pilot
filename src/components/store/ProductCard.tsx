import { Link } from "@tanstack/react-router";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import { discountPercent, fmt, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export function ProductCard({ p }: { p: Product }) {
  const { add, favorites, toggleFavorite } = useCart();
  const liked = favorites.includes(p.id);
  return (
    <article className="group relative flex flex-col rounded-lg border bg-card p-2 transition hover:shadow-lg">
      <button aria-label={liked ? "إزالة من المفضلة" : "أضف للمفضلة"} aria-pressed={liked} onClick={() => toggleFavorite(p.id)} className="absolute top-3 left-3 z-10 rounded-full bg-card p-1.5 shadow">
        <Heart className={`h-4 w-4 ${liked ? "fill-destructive text-destructive" : ""}`} />
      </button>
      <Link to="/product/$id" params={{ id: p.id }} className="flex flex-1 flex-col">
        <img src={p.img} alt={p.name} loading="lazy" width={816} height={816} className="aspect-square w-full rounded bg-muted object-contain" />
        <h3 className="mt-2 line-clamp-2 text-sm">{p.name}</h3>
        {p.seller && <div className="mt-1 text-[11px] text-muted-foreground">من {p.seller.name}</div>}
        {p.reviews > 0 && <div className="mt-1 flex items-center gap-1 text-xs"><span className="flex items-center gap-0.5 rounded bg-success px-1 font-bold text-accent-foreground">{fmt(p.rating)}<Star className="h-3 w-3 fill-current" /></span><span className="text-muted-foreground">({fmt(p.reviews)})</span></div>}
        <div className="mt-1 font-black">{fmt(p.price)} <span className="text-xs font-semibold">ج.م</span></div>
        {p.oldPrice > p.price && <div className="flex gap-2 text-xs"><s className="text-muted-foreground">{fmt(p.oldPrice)}</s><span className="font-bold text-success">خصم {fmt(discountPercent(p))}٪</span></div>}
        {p.express && <span className="mt-1 w-fit rounded bg-primary px-1.5 text-[10px] font-black italic">سريع ⚡</span>}
      </Link>
      <button disabled={p.stock === 0} onClick={() => { add(p.id); toast.success("تمت الإضافة إلى العربة"); }} className="mt-2 rounded-md bg-secondary py-1.5 text-xs font-bold text-secondary-foreground hover:bg-accent disabled:opacity-50">{p.stock === 0 ? "نفدت الكمية" : "أضف إلى العربة"}</button>
    </article>
  );
}

export function ProductGrid({ items }: { items: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}
