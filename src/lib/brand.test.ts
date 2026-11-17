import { describe, expect, it } from "vitest";
import { brandCss, brandSchema, contrast, DEFAULT_BRAND, readableOn, resolveBrand } from "./brand";

describe("brand settings", () => {
  it("falls back to the Seen defaults when nothing is saved", () => {
    expect(resolveBrand({})).toEqual(DEFAULT_BRAND);
    expect(resolveBrand(null).storeName).toBe("سين");
  });
  it("keeps saved values and fills missing ones", () => {
    const b = resolveBrand({ storeName: "متجري", colors: { primary: "#112233" } });
    expect(b.storeName).toBe("متجري");
    expect(b.colors).toEqual({ ...DEFAULT_BRAND.colors, primary: "#112233" });
  });
  it("ignores invalid saved colors instead of breaking the site", () => {
    expect(resolveBrand({ colors: { primary: "red" } }).colors.primary).toBe("#B5CFA3");
  });
  it("rejects an empty store name and non-https social links", () => {
    expect(brandSchema.safeParse({ ...DEFAULT_BRAND, storeName: " " }).success).toBe(false);
    expect(brandSchema.safeParse({ ...DEFAULT_BRAND, social: { ...DEFAULT_BRAND.social, facebook: "http://fb.com/x" } }).success).toBe(false);
  });
  it("picks readable text on button colors", () => {
    expect(readableOn("#B5CFA3", "#22352C")).toBe("#22352C");
    expect(readableOn("#A23D01", "#22352C")).toBe("#FFFFFF");
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21);
    expect(brandCss(DEFAULT_BRAND)).toContain("--brand-yellow:#B5CFA3");
  });
});
