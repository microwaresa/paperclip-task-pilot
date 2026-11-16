import { createFileRoute, Link } from "@tanstack/react-router";
import { getProduct, type Product } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductGrid } from "@/components/store/ProductCard";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "المفضلة | سين" },
      { name: "description", content: "المنتجات التي حفظتها في المفضلة على سين." },
      { property: "og:title", content: "المفضلة | سين" },
      { property: "og:description", content: "احفظ المنتجات التي تعجبك وارجع لها لاحقًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites } = useCart();
  const items = favorites.map(getProduct).filter((x): x is Product => !!x);
  return (
    <StoreLayout>
      <section className="rounded-lg bg-card p-4">
        <h1 className="mb-4 text-xl font-black">المفضلة</h1>
        {items.length ? <ProductGrid items={items} /> : (
          <div className="py-16 text-center">
            <p className="font-bold">لم تحفظ أي منتج بعد</p>
            <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">ابدأ التسوق</Link>
          </div>
        )}
      </section>
    </StoreLayout>
  );
}
