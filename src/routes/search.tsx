import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { fmt, searchProducts } from "@/lib/catalog";
import { sortProducts, sorts } from "@/lib/sorting";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductGrid } from "@/components/store/ProductCard";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "relevance").default("relevance"),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  head: () => ({
    meta: [
      { title: "البحث والعروض | سين" },
      { name: "description", content: "ابحث بين منتجات سين ورتّبها حسب السعر أو الخصم أو الأكثر مبيعًا." },
      { property: "og:title", content: "البحث والعروض | سين" },
      { property: "og:description", content: "اعثر على المنتج المناسب بأفضل سعر في سين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, sort } = Route.useSearch();
  const query = q.slice(0, 100);
  const results = sortProducts(searchProducts(query), sort);
  return (
    <StoreLayout query={query}>
      <section className="rounded-lg bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-black">{query ? <>نتائج البحث عن «{query}»</> : sort === "discount" ? "كل العروض" : "كل المنتجات"} <span className="text-sm font-semibold text-muted-foreground">({fmt(results.length)} منتج)</span></h1>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {sorts.map((o) => (
              <Link key={o.v} to="/search" search={{ q: query, sort: o.v }} className={`rounded-full border px-3 py-1 ${sort === o.v ? "border-secondary bg-secondary text-secondary-foreground" : ""}`}>{o.l}</Link>
            ))}
          </div>
        </div>
        {results.length ? <ProductGrid items={results} /> : (
          <div className="py-16 text-center">
            <p className="text-lg font-bold">لا توجد نتائج مطابقة</p>
            <p className="mt-1 text-sm text-muted-foreground">جرّب كلمة أخرى مثل «موبايل» أو «سماعة».</p>
            <Link to="/search" search={{ q: "", sort: "relevance" }} className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">تصفح كل المنتجات</Link>
          </div>
        )}
      </section>
    </StoreLayout>
  );
}
