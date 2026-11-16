import { createContext, type Context, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct, isSellerProductId, type Product } from "./catalog";
import { sellerProductsQuery } from "./market.functions";
import { useQuery } from "@tanstack/react-query";
import { clampQty, computeTotals, DEFAULT_DELIVERY } from "./pricing";
import { deliveryQuery } from "./settings.functions";

type Line = { id: string; qty: number };
type CartCtx = {
  lines: (Line & { product: Product })[];
  /** Products the shopper saved, including seller products loaded from the store. */
  findProduct: (id: string) => Product | undefined;
  count: number;
  totals: ReturnType<typeof computeTotals>;
  freeShippingMin: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
};

// Keep one context object across hot reloads so a reloaded module still finds the mounted provider.
const g = globalThis as unknown as { __seenCartCtx?: Context<CartCtx | null> };
const Ctx = (g.__seenCartCtx ??= createContext<CartCtx | null>(null));
const CART_KEY = "seen-cart";
const FAV_KEY = "seen-favorites";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<Line[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const delivery = useQuery(deliveryQuery).data ?? DEFAULT_DELIVERY;
  const sellerIds = useMemo(() => [...new Set([...raw.map((l) => l.id), ...favorites])].filter(isSellerProductId).sort(), [raw, favorites]);
  const sellerProducts = useQuery({ ...sellerProductsQuery({ ids: sellerIds }), enabled: sellerIds.length > 0 }).data;

  useEffect(() => {
    setRaw(read<Line[]>(CART_KEY, []));
    setFavorites(read<string[]>(FAV_KEY, []));
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(CART_KEY, JSON.stringify(raw)); }, [raw, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); }, [favorites, loaded]);

  const value = useMemo<CartCtx>(() => {
    const lines = raw.flatMap((l) => {
      const product = getProduct(l.id) ?? sellerProducts?.find((x) => x.id === l.id);
      return product ? [{ ...l, product }] : [];
    });
    return {
      lines,
      findProduct: (id: string) => getProduct(id) ?? sellerProducts?.find((x) => x.id === id),
      count: lines.reduce((s, l) => s + l.qty, 0),
      totals: computeTotals(lines.map((l) => ({ price: l.product.price, qty: l.qty })), delivery),
      freeShippingMin: delivery.freeShippingMin,
      add: (id, qty = 1) =>
        setRaw((r) => {
          const ex = r.find((l) => l.id === id);
          return ex ? r.map((l) => (l.id === id ? { ...l, qty: clampQty(l.qty + qty) } : l)) : [...r, { id, qty: clampQty(qty) }];
        }),
      setQty: (id, qty) => setRaw((r) => r.map((l) => (l.id === id ? { ...l, qty: clampQty(qty) } : l))),
      remove: (id) => setRaw((r) => r.filter((l) => l.id !== id)),
      clear: () => setRaw([]),
      favorites,
      toggleFavorite: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    };
  }, [raw, favorites, delivery, sellerProducts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
