import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { fmt, getCategory, productsInCategory } from "@/lib/catalog";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductGrid } from "@/components/store/ProductCard";
import { sortProducts, sorts } from "@/lib/sorting";
import { useQuery } from "@tanstack/react-query";
import { sellerProductsQuery } from "@/lib/market.functions";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: zodValidator(z.object({ sort: fallback(z.string(), "relevance").default("relevance") })),
  loader: ({ params }) => {
    const category = getCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.category.name;
    const title = name ? `${name} | تسوق أونلاين من سين` : "قسم غير متاح | سين";
    const description = name ? `تسوق أفضل منتجات ${name} بأسعار مميزة وتوصيل سريع في مصر.` : "هذا القسم غير متاح.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(name ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: CategoryPage,
  notFoundComponent: () => (
    <StoreLayout>
      <div className="rounded-lg bg-card py-16 text-center">
        <p className="text-lg font-bold">هذا القسم غير موجود</p>
        <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">العودة للرئيسية</Link>
      </div>
    </StoreLayout>
  ),
  errorComponent: () => <StoreLayout><p className="py-16 text-center font-bold">تعذر تحميل القسم.</p></StoreLayout>,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const { sort } = Route.useSearch();
  const sellers = useQuery(sellerProductsQuery({ category: category.slug })).data ?? [];
  const items = sortProducts([...productsInCategory(category.slug), ...sellers], sort);
  return (
    <StoreLayout>
      <nav className="text-xs text-muted-foreground"><Link to="/">الرئيسية</Link> / <span className="text-foreground">{category.name}</span></nav>
      <section className="rounded-lg bg-card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black">{category.name} <span className="text-sm font-semibold text-muted-foreground">({fmt(items.length)} منتج)</span></h1>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {sorts.map((o) => (
              <Link key={o.v} to="/category/$slug" params={{ slug: category.slug }} search={{ sort: o.v }} className={`rounded-full border px-3 py-1 ${sort === o.v ? "border-secondary bg-secondary text-secondary-foreground" : ""}`}>{o.l}</Link>
            ))}
          </div>
        </div>
        <ProductGrid items={items} />
      </section>
    </StoreLayout>
  );
}
