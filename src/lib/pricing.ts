export const FREE_SHIPPING_MIN = 200;
export const SHIPPING_FEE = 50;
export const MAX_QTY = 10;

export type PricedLine = { price: number; qty: number };

export function computeTotals(lines: PricedLine[]) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  return { subtotal, shipping, total: subtotal + shipping };
}

export const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(n) || 1));
