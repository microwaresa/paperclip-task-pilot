import type { Product } from "./catalog";

export type SellerProductRow = {
  id: string; name: string; brand: string; category: string; price: number; old_price: number | null;
  sale_price?: number | null; sale_ends_at?: string | null;
  description: string; image_url: string | null; image_urls?: string[] | null; stock: number;
  merchants: { store_name: string; slug: string } | null;
};

export const SELLER_PRODUCT_COLUMNS = "id, name, brand, category, price, old_price, sale_price, sale_ends_at, description, image_url, image_urls, stock, merchants!inner(store_name, slug, status)";

/** Placeholder shown when a seller hasn't uploaded a photo. */
export const NO_IMAGE = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f3f3f3"/><text x="50" y="56" font-size="12" text-anchor="middle" fill="#999">بدون صورة</text></svg>');

/** A timed sale is live when it has a price and its end time hasn't passed. */
export function saleActive(r: { sale_price?: number | null; sale_ends_at?: string | null }, now = Date.now()) {
  return !!r.sale_price && !!r.sale_ends_at && new Date(r.sale_ends_at).getTime() > now;
}
export const effectivePrice = (r: { price: number; sale_price?: number | null; sale_ends_at?: string | null }, now = Date.now()) =>
  saleActive(r, now) ? Math.min(r.sale_price!, r.price) : r.price;

export function toProduct(r: SellerProductRow): Product {
  const onSale = saleActive(r);
  return {
    id: r.id, name: r.name, brand: r.brand || (r.merchants?.store_name ?? ""), category: r.category,
    img: r.image_urls?.[0] || r.image_url || NO_IMAGE, images: r.image_urls?.length ? r.image_urls : r.image_url ? [r.image_url] : [], price: effectivePrice(r), oldPrice: onSale ? Math.max(r.old_price ?? 0, r.price) : r.old_price ?? r.price,
    ...(onSale ? { saleEndsAt: r.sale_ends_at! } : {}),
    rating: 0, reviews: 0, express: false, description: r.description, highlights: [],
    stock: r.stock, ...(r.merchants ? { seller: { name: r.merchants.store_name, slug: r.merchants.slug } } : {}),
  };
}
