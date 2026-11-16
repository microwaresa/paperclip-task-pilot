import { describe, expect, it } from "vitest";
import { products } from "@/lib/catalog";
import { addViewed, suggest } from "@/lib/recently-viewed";

describe("recently viewed", () => {
  it("keeps newest first without duplicates, capped at 12", () => {
    let list = products.slice(0, 3);
    list = addViewed(list, products[2]!);
    expect(list.map((p) => p.id)).toEqual([products[2]!.id, products[0]!.id, products[1]!.id]);
    let many: typeof products = [];
    for (const p of [...products, ...products]) many = addViewed(many, p);
    expect(many.length).toBeLessThanOrEqual(12);
  });
  it("suggests unseen products from the viewed category", () => {
    const viewed = [products[0]!];
    const s = suggest(viewed, products);
    expect(s.some((p) => p.id === viewed[0]!.id)).toBe(false);
    expect(s.length).toBeGreaterThan(0);
    expect(s[0]!.category === viewed[0]!.category || s[0]!.brand === viewed[0]!.brand).toBe(true);
  });
  it("suggests nothing when nothing was viewed", () => {
    expect(suggest([], products)).toEqual([]);
  });
});
