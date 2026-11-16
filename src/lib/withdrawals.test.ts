import { describe, expect, it } from "vitest";
import { withdrawable } from "./merchant-stats";

describe("withdrawable", () => {
  it("subtracts pending requests from the payable balance", () => {
    expect(withdrawable(701.1, [{ amount: 200, status: "pending" }, { amount: 100, status: "paid" }, { amount: 50, status: "rejected" }])).toBe(501.1);
  });
  it("never goes below zero", () => {
    expect(withdrawable(100, [{ amount: "150", status: "pending" }])).toBe(0);
  });
});
