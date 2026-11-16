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

export type CouponKind = "percent" | "fixed" | "free_shipping";
export type CouponRule = {
  kind: CouponKind; value: number; min_order: number; merchant_id: string | null;
  active: boolean; expires_at: string | null; max_uses: number | null; used_count: number;
};
export type CouponLine = PricedLine & { merchantId?: string | null };

/**
 * Discount a coupon gives on a cart. Store coupons (merchant_id null) cover the whole cart;
 * seller coupons cover only that seller's lines. Returns the per-line share so sellers absorb
 * their own coupons. Returns an Arabic error when the code can't be used.
 */
export function applyCoupon(c: CouponRule, lines: CouponLine[], shipping: number, now = Date.now()):
  { ok: true; discount: number; lineDiscounts: number[] } | { ok: false; error: string } {
  if (!c.active) return { ok: false, error: "هذا الكود غير مفعل" };
  if (c.expires_at && new Date(c.expires_at).getTime() <= now) return { ok: false, error: "انتهت صلاحية هذا الكود" };
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { ok: false, error: "تم استخدام هذا الكود بالكامل" };
  const eligible = lines.map((l) => !c.merchant_id || l.merchantId === c.merchant_id);
  const base = lines.reduce((s, l, i) => s + (eligible[i] ? l.price * l.qty : 0), 0);
  if (base === 0) return { ok: false, error: "هذا الكود لا ينطبق على منتجات عربتك" };
  if (base < c.min_order) return { ok: false, error: `الحد الأدنى لاستخدام الكود ${c.min_order} ج.م` };
  const lineDiscounts = lines.map(() => 0);
  if (c.kind === "free_shipping") {
    if (shipping === 0) return { ok: false, error: "التوصيل مجاني بالفعل" };
    return { ok: true, discount: shipping, lineDiscounts };
  }
  const discount = c.kind === "percent" ? Math.floor((base * Math.min(100, c.value)) / 100) : Math.min(c.value, base);
  if (c.merchant_id) {
    let left = discount; let last = -1;
    lines.forEach((l, i) => { if (eligible[i]) { const d = Math.floor((discount * l.price * l.qty) / base); lineDiscounts[i] = d; left -= d; last = i; } });
    lineDiscounts[last]! += left;
  }
  return { ok: true, discount, lineDiscounts };
}
