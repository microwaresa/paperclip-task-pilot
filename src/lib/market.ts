import type { Product } from "./catalog";

export type SellerProductRow = {
  id: string; name: string; brand: string; category: string; price: number; old_price: number | null;
  description: string; image_url: string | null; image_urls?: string[] | null; stock: number;
  merchants: { store_name: string; slug: string } | null;
};

export const SELLER_PRODUCT_COLUMNS = "id, name, brand, category, price, old_price, description, image_url, image_urls, stock, merchants!inner(store_name, slug, status)";

/** Placeholder shown when a seller hasn't uploaded a photo. */
export const NO_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f3f3f3"/><text x="50" y="56" font-size="12" text-anchor="middle" fill="#999">بدون صورة</text></svg>');

export function toProduct(r: SellerProductRow): Product {
  return {
    id: r.id, name: r.name, brand: r.brand || (r.merchants?.store_name ?? ""), category: r.category,
    img: r.image_urls?.[0] || r.image_url || NO_IMAGE, images: r.image_urls?.length ? r.image_urls : r.image_url ? [r.image_url] : [], price: r.price, oldPrice: r.old_price ?? r.price,
    rating: 0, reviews: 0, express: false, description: r.description, highlights: [],
    stock: r.stock, ...(r.merchants ? { seller: { name: r.merchants.store_name, slug: r.merchants.slug } } : {}),
  };
}
