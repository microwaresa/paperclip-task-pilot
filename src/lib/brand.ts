import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح");
const text = (max: number) => z.string().trim().max(max);
const url = z.union([z.literal(""), z.string().trim().url().max(300).refine((u) => u.startsWith("https://"), "يجب أن يبدأ الرابط بـ https://")]);

export const slideSchema = z.object({ badge: text(40), title: text(80), text: text(160) });

export const brandSchema = z.object({
  storeName: text(30).min(1, "اسم المتجر مطلوب"),
  tagline: text(120),
  colors: z.object({ primary: hex, secondary: hex, accent: hex, background: hex }),
  announcement: z.object({ enabled: z.boolean(), text: text(160) }),
  slides: z.array(slideSchema).length(3),
  badges: z.array(text(60)).length(2),
  contact: z.object({ phone: text(30), email: z.union([z.literal(""), z.string().trim().email().max(120)]), whatsapp: text(30) }),
  social: z.object({ facebook: url, instagram: url, tiktok: url }),
  copyright: text(120),
});
export type Brand = z.infer<typeof brandSchema>;

export const DEFAULT_BRAND: Brand = {
  storeName: "سين",
  tagline: "اكتشف عالمًا من الاختيارات",
  colors: { primary: "#B5CFA3", secondary: "#22352C", accent: "#A23D01", background: "#FFFFFF" },
  announcement: { enabled: false, text: "" },
  slides: [
    { badge: "الجمعة البيضاء", title: "خصومات تصل إلى ٤٠٪", text: "على الموبايلات والإلكترونيات والموضة" },
    { badge: "جديد الإلكترونيات", title: "أحدث الأجهزة بأفضل سعر", text: "موبايلات وسماعات وساعات ذكية مع توصيل سريع" },
    { badge: "بيتك أحلى", title: "مستلزمات المنزل والمطبخ", text: "اختيارات مميزة من بائعي سين" },
  ],
  badges: ["ادفع عند الاستلام", "إرجاع مجاني خلال ١٤ يوم"],
  contact: { phone: "", email: "", whatsapp: "" },
  social: { facebook: "", instagram: "", tiktok: "" },
  copyright: "جميع الحقوق محفوظة.",
};

/** Merge a stored (possibly partial or outdated) brand row over the defaults, dropping invalid parts. */
export function resolveBrand(raw: unknown): Brand {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <K extends keyof Brand>(k: K): Brand[K] => {
    const merged = typeof DEFAULT_BRAND[k] === "object" && !Array.isArray(DEFAULT_BRAND[k]) && r[k] && typeof r[k] === "object"
      ? { ...(DEFAULT_BRAND[k] as object), ...(r[k] as object) } : r[k];
    const ok = brandSchema.shape[k].safeParse(merged);
    return ok.success ? (ok.data as Brand[K]) : DEFAULT_BRAND[k];
  };
  return Object.fromEntries((Object.keys(DEFAULT_BRAND) as (keyof Brand)[]).map((k) => [k, pick(k)])) as Brand;
}

/** Relative luminance (WCAG) of a #rrggbb color. */
export function luminance(h: string): number {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** Text color for a fill: the dark brand color when it reads well, else white. */
export function readableOn(fill: string, dark: string): string {
  return contrast(fill, dark) >= contrast(fill, "#FFFFFF") ? dark : "#FFFFFF";
}

/** CSS variable overrides applied on top of styles.css. */
export function brandCss(b: Brand): string {
  const { primary, secondary, accent, background } = b.colors;
  const darkText = luminance(secondary) < 0.2 ? secondary : "#1A1A1A";
  const vars: Record<string, string> = {
    "--brand-yellow": primary, "--brand-forest": darkText, "--brand-rust": accent, "--brand-mint": background,
    "--primary-foreground": readableOn(primary, darkText),
    "--secondary": secondary, "--secondary-foreground": readableOn(secondary, darkText),
    "--accent-foreground": readableOn(accent, darkText),
  };
  return `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;
}
