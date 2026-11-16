export const FREE_SHIPPING_MIN = 200;
export const SHIPPING_FEE = 50;
export const MAX_QTY = 10;

export const PAYOUT_HOLD_DAYS = 7;
export type DeliverySettings = { shippingFee: number; freeShippingMin: number; payoutHoldDays?: number };
export const DEFAULT_DELIVERY: DeliverySettings = { shippingFee: SHIPPING_FEE, freeShippingMin: FREE_SHIPPING_MIN, payoutHoldDays: PAYOUT_HOLD_DAYS };

export type PricedLine = { price: number; qty: number };

export function computeTotals(lines: PricedLine[], d: DeliverySettings = DEFAULT_DELIVERY) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= d.freeShippingMin ? 0 : d.shippingFee;
  return { subtotal, shipping, total: subtotal + shipping };
}

export const clampQty = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(n) || 1));
