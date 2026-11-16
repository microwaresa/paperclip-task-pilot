import { describe, expect, it } from "vitest";
import { sellerEarnings } from "./merchant-stats";

describe("seller earnings", () => {
  it("only delivered lines count and each uses its own commission rate", () => {
    const e = sellerEarnings([
      { price: 1000, qty: 1, status: "delivered", commission_rate: 10 },
      { price: 500, qty: 2, status: "delivered", commission_rate: "0" },
      { price: 999, qty: 1, status: "shipped", commission_rate: 10 },
      { price: 999, qty: 1, status: "cancelled", commission_rate: 10 },
    ], []);
    expect(e).toMatchObject({ gross: 2000, commission: 100, net: 1900 });
  });
  it("payouts reduce the balance owed", () => {
    const e = sellerEarnings([{ price: 300, qty: 1, status: "delivered", commission_rate: 0 }], [{ amount: "100" }]);
    expect(e.paid).toBe(100);
    expect(e.balance).toBe(200);
  });
});

describe("payout waiting period", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  const line = (deliveredAt: string) => ({ price: 100, qty: 1, status: "delivered", commission_rate: 0, delivered_at: deliveredAt });
  it("earnings delivered less than 7 days ago are held, not payable", () => {
    const e = sellerEarnings([line("2026-11-10T12:00:01Z"), line("2026-11-09T12:00:00Z")], [], 7, now);
    expect(e.held).toBe(100);
    expect(e.available).toBe(100);
    expect(e.balance).toBe(100);
  });
  it("a 0-day period makes all delivered earnings payable at once", () => {
    expect(sellerEarnings([line("2026-11-16T11:59:00Z")], [], 0, now).available).toBe(100);
  });
});
