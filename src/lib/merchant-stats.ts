export type SellerLine = { order_id: string; product_id: string; name: string; price: number; qty: number; status: string };

/** Sales summary for a seller's order lines. Cancelled lines never count. */
export function sellerSummary(lines: SellerLine[]) {
  const live = lines.filter((l) => l.status !== "cancelled");
  const sum = (ls: SellerLine[]) => ls.reduce((s, l) => s + l.price * l.qty, 0);
  const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const l of live) {
    const e = byProduct.get(l.product_id) ?? { name: l.name, qty: 0, revenue: 0 };
    e.qty += l.qty; e.revenue += l.price * l.qty; byProduct.set(l.product_id, e);
  }
  return {
    orders: new Set(live.map((l) => l.order_id)).size,
    units: live.reduce((s, l) => s + l.qty, 0),
    deliveredRevenue: sum(live.filter((l) => l.status === "delivered")),
    openRevenue: sum(live.filter((l) => l.status !== "delivered")),
    toShip: live.filter((l) => l.status === "pending").length,
    top: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  };
}

/** Sellers move a line forward one step only: pending → shipped → delivered. */
export const nextSellerStatus = (s: string) => (s === "pending" ? "shipped" : s === "shipped" ? "delivered" : null);

export type EarningLine = { price: number; qty: number; status: string; commission_rate: number | string };

/** Seller earnings: only delivered lines are earned; commission uses each line's rate at order time. */
export function sellerEarnings(lines: EarningLine[], payouts: { amount: number | string }[]) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const delivered = lines.filter((l) => l.status === "delivered");
  const gross = r2(delivered.reduce((s, l) => s + l.price * l.qty, 0));
  const commission = r2(delivered.reduce((s, l) => s + (l.price * l.qty * Number(l.commission_rate)) / 100, 0));
  const net = r2(gross - commission);
  const paid = r2(payouts.reduce((s, p) => s + Number(p.amount), 0));
  return { gross, commission, net, paid, balance: r2(net - paid) };
}
