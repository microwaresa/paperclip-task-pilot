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
