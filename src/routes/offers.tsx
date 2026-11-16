import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Timer } from "lucide-react";
import { discountPercent, fmt, products } from "@/lib/catalog";
import { sellerProductsQuery } from "@/lib/market.functions";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductGrid } from "@/components/store/ProductCard";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "العروض والتخفيضات | سين" },
      { name: "description", content: "عروض لفترة محدودة وتخفيضات على منتجات سين، مع أكواد خصم عند الدفع." },
      { property: "og:title", content: "العروض والتخفيضات | سين" },
      { property: "og:description", content: "اكتشف أقوى العروض لفترة محدودة على سين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OffersPage,
});

function OffersPage() {
  const sellers = useQuery(sellerProductsQuery({})).data ?? [];
  const timed = sellers.filter((p) => p.saleEndsAt).sort((a, b) => a.saleEndsAt!.localeCompare(b.saleEndsAt!));
  const discounted = [...products, ...sellers].filter((p) => !p.saleEndsAt && discountPercent(p) > 0).sort((a, b) => discountPercent(b) - discountPercent(a));
  return (
    <StoreLayout>
      <h1 className="text-2xl font-black">العروض والتخفيضات</h1>
      <p className="text-sm text-muted-foreground">لديك كود خصم؟ أدخله في صفحة إتمام الشراء.</p>
      {timed.length > 0 && (
        <section className="rounded-lg bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><Timer className="h-5 w-5 text-accent" />عروض لفترة محدودة <span className="text-sm font-semibold text-muted-foreground">({fmt(timed.length)})</span></h2>
          <ProductGrid items={timed} />
        </section>
      )}
      <section className="rounded-lg bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black"><Flame className="h-5 w-5 text-accent" />تخفيضات <span className="text-sm font-semibold text-muted-foreground">({fmt(discounted.length)})</span></h2>
        {discounted.length ? <ProductGrid items={discounted} /> : <p className="text-sm text-muted-foreground">لا توجد تخفيضات حاليًا.</p>}
      </section>
    </StoreLayout>
  );
}
