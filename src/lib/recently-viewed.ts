import { useEffect, useState } from "react";
import type { Product } from "@/lib/catalog";

const KEY = "seen:recently-viewed";
const EVENT = "seen:recently-viewed-change";
export const MAX_VIEWED = 12;

/** Newest first, no duplicates, capped. */
export function addViewed(list: Product[], p: Product, max = MAX_VIEWED): Product[] {
  return [p, ...list.filter((x) => x.id !== p.id)].slice(0, max);
}

/** Score unseen products by shared category (recent views weigh more) and brand. */
export function suggest(viewed: Product[], pool: Product[], limit = 10): Product[] {
  if (!viewed.length) return [];
  const seen = new Set(viewed.map((v) => v.id));
  const cat = new Map<string, number>();
  const brand = new Map<string, number>();
  viewed.forEach((v, i) => {
    const w = viewed.length - i;
    cat.set(v.category, (cat.get(v.category) ?? 0) + w);
    brand.set(v.brand, (brand.get(v.brand) ?? 0) + w / 2);
  });
  // Related items first, then popular ones so the row is never nearly empty.
  return pool
    .filter((p) => !seen.has(p.id))
    .map((p) => ({ p, s: (cat.get(p.category) ?? 0) + (brand.get(p.brand) ?? 0) }))
    .sort((a, b) => b.s - a.s || b.p.reviews - a.p.reviews)
    .slice(0, limit)
    .map((x) => x.p);
}

function read(): Product[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Product[]; } catch { return []; }
}

export function recordView(p: Product) {
  try {
    localStorage.setItem(KEY, JSON.stringify(addViewed(read(), p)));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* storage full or blocked */ }
}

export function clearViewed() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useRecentlyViewed(): Product[] {
  const [list, setList] = useState<Product[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return list;
}
