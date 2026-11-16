import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct, type Product } from "./catalog";
import { clampQty, computeTotals } from "./pricing";

type Line = { id: string; qty: number };
type CartCtx = {
  lines: (Line & { product: Product })[];
  count: number;
  totals: ReturnType<typeof computeTotals>;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
};

const Ctx = createContext<CartCtx | null>(null);
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

  useEffect(() => {
    setRaw(read<Line[]>(CART_KEY, []));
    setFavorites(read<string[]>(FAV_KEY, []));
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(CART_KEY, JSON.stringify(raw)); }, [raw, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); }, [favorites, loaded]);

  const value = useMemo<CartCtx>(() => {
    const lines = raw.flatMap((l) => {
      const product = getProduct(l.id);
      return product ? [{ ...l, product }] : [];
    });
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      totals: computeTotals(lines.map((l) => ({ price: l.product.price, qty: l.qty }))),
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
  }, [raw, favorites]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
