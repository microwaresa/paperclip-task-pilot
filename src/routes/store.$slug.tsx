import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Store } from "lucide-react";
import { fmt } from "@/lib/catalog";
import { getStore } from "@/lib/market.functions";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductGrid } from "@/components/store/ProductCard";

export const Route = createFileRoute("/store/$slug")({
  loader: async ({ params }) => {
    const res = await getStore({ data: { slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const s = loaderData?.store;
    const title = s ? `${s.store_name} | متجر على سين` : "متجر غير متاح | سين";
    const description = s ? (s.description || `تسوق منتجات ${s.store_name} على سين.`) : "هذا المتجر غير متاح.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        ...(s ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: StorePage,
  notFoundComponent: () => (
    <StoreLayout>
      <div className="rounded-lg bg-card py-16 text-center">
        <p className="text-lg font-bold">هذا المتجر غير متاح</p>
        <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">العودة للرئيسية</Link>
      </div>
    </StoreLayout>
  ),
  errorComponent: () => <StoreLayout><p className="py-16 text-center font-bold">تعذر تحميل المتجر.</p></StoreLayout>,
});

function StorePage() {
  const { store, products } = Route.useLoaderData();
  return (
    <StoreLayout>
      <section className="flex items-center gap-4 rounded-lg bg-card p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground"><Store className="h-8 w-8" /></div>
        <div>
          <h1 className="text-2xl font-black">{store.store_name}</h1>
          {store.description && <p className="text-sm text-muted-foreground">{store.description}</p>}
          <p className="text-xs text-muted-foreground">{fmt(products.length)} منتج · على سين منذ {new Date(store.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long" })}</p>
        </div>
      </section>
      <section className="rounded-lg bg-card p-4">
        {products.length ? <ProductGrid items={products} /> : <p className="py-12 text-center font-bold">لا توجد منتجات في هذا المتجر بعد</p>}
      </section>
    </StoreLayout>
  );
}
