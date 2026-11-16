import { describe, it, expect } from "vitest";
import { nextSellerStatus, sellerSummary } from "./merchant-stats";

const l = (o: string, p: string, price: number, qty: number, status: string) => ({ order_id: o, product_id: p, name: p, price, qty, status });

describe("sellerSummary", () => {
  it("counts delivered sales as earned and leaves cancelled lines out", () => {
    const s = sellerSummary([l("a", "x", 100, 2, "delivered"), l("b", "x", 100, 1, "shipped"), l("c", "y", 500, 1, "cancelled")]);
    expect(s.deliveredRevenue).toBe(200);
    expect(s.openRevenue).toBe(100);
    expect(s.orders).toBe(2);
    expect(s.units).toBe(3);
  });
});

describe("nextSellerStatus", () => {
  it("only moves forward one step", () => {
    expect(nextSellerStatus("pending")).toBe("shipped");
    expect(nextSellerStatus("shipped")).toBe("delivered");
    expect(nextSellerStatus("delivered")).toBeNull();
    expect(nextSellerStatus("cancelled")).toBeNull();
  });
});
