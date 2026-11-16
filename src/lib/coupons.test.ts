import { describe, expect, it } from "vitest";
import { applyCoupon, type CouponRule } from "./pricing";

const base: CouponRule = { kind: "percent", value: 10, min_order: 0, merchant_id: null, active: true, expires_at: null, max_uses: null, used_count: 0 };
const lines = [{ price: 300, qty: 1, merchantId: null }, { price: 100, qty: 2, merchantId: "m1" }];

describe("applyCoupon", () => {
  it("percent store code discounts the whole cart", () => {
    const r = applyCoupon(base, lines, 0);
    expect(r.ok && r.discount).toBe(50);
  });
  it("fixed amount never exceeds the eligible total", () => {
    const r = applyCoupon({ ...base, kind: "fixed", value: 999, merchant_id: "m1" }, lines, 0);
    expect(r.ok && r.discount).toBe(200);
    expect(r.ok && r.lineDiscounts).toEqual([0, 200]);
  });
  it("seller code only counts that seller's products", () => {
    const r = applyCoupon({ ...base, merchant_id: "m1" }, lines, 0);
    expect(r.ok && r.discount).toBe(20);
  });
  it("free shipping removes the delivery fee", () => {
    const r = applyCoupon({ ...base, kind: "free_shipping" }, lines, 50);
    expect(r.ok && r.discount).toBe(50);
  });
  it("rejects below minimum order", () => {
    expect(applyCoupon({ ...base, min_order: 600 }, lines, 0).ok).toBe(false);
  });
  it("rejects expired codes", () => {
    expect(applyCoupon({ ...base, expires_at: "2020-01-01T00:00:00Z" }, lines, 0).ok).toBe(false);
  });
  it("rejects when total uses are used up", () => {
    expect(applyCoupon({ ...base, max_uses: 3, used_count: 3 }, lines, 0).ok).toBe(false);
  });
});
