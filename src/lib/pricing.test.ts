import { describe, expect, it } from "vitest";
import { clampQty, computeTotals } from "./pricing";

describe("order totals", () => {
  it("charges 50 EGP delivery below 200 EGP", () => {
    expect(computeTotals([{ price: 150, qty: 1 }])).toEqual({ subtotal: 150, shipping: 50, total: 200 });
  });
  it("delivers free at 200 EGP or more", () => {
    expect(computeTotals([{ price: 100, qty: 2 }])).toEqual({ subtotal: 200, shipping: 0, total: 200 });
  });
  it("limits quantity to between 1 and 10", () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(25)).toBe(10);
  });
});
