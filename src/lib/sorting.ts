import { discountPercent, type Product } from "./catalog";

export const sorts = [
  { v: "relevance", l: "الأنسب" },
  { v: "discount", l: "أعلى خصم" },
  { v: "price-asc", l: "السعر: من الأقل" },
  { v: "price-desc", l: "السعر: من الأعلى" },
  { v: "popular", l: "الأكثر مبيعًا" },
];

export function sortProducts(items: Product[], sort: string) {
  const s = [...items];
  if (sort === "discount") s.sort((a, b) => discountPercent(b) - discountPercent(a));
  else if (sort === "price-asc") s.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") s.sort((a, b) => b.price - a.price);
  else if (sort === "popular") s.sort((a, b) => b.reviews - a.reviews);
  return s;
}

