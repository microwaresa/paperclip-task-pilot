import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminUpdateBrand } from "@/lib/admin.functions";
import { brandQuery } from "@/lib/settings.functions";
import { brandCss, brandSchema, contrast, DEFAULT_BRAND, textColor, type Brand } from "@/lib/brand";

const input = "mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm font-normal";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 border-b pb-6">
      <legend className="text-base font-black">{title}</legend>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block text-sm font-bold">{label}<input {...p} className={input} /></label>;
}

const colorLabels: Record<keyof Brand["colors"], string> = {
  primary: "اللون الأساسي (الشريط العلوي والأزرار)",
  secondary: "اللون الداكن (التذييل والنصوص)",
  accent: "لون التمييز (الروابط والشارات)",
  background: "لون خلفية الصفحات",
};

/** Admin form for the store's name, colors, announcement, banners, contact and social links. */
export function BrandSettings() {
  const qc = useQueryClient();
  const save = useServerFn(adminUpdateBrand);
  const { data } = useQuery(brandQuery);
  const [b, setB] = useState<Brand>(DEFAULT_BRAND);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setB(data); }, [data]);

  const set = <K extends keyof Brand>(k: K, v: Brand[K]) => setB((x) => ({ ...x, [k]: v }));
  const sub = <K extends "colors" | "announcement" | "contact" | "social">(k: K, f: keyof Brand[K], v: unknown) => setB((x) => ({ ...x, [k]: { ...x[k], [f]: v } }));
  const darkText = textColor(b);
  const weak = contrast(b.colors.background, darkText) < 4.5;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = brandSchema.safeParse(b);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "راجع البيانات"); return; }
    setBusy(true);
    try {
      await save({ data: parsed.data });
      await qc.invalidateQueries({ queryKey: brandQuery.queryKey });
      toast.success("تم حفظ الهوية، وتظهر الآن في كل صفحات المتجر");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-black">الهوية والمظهر</h2>
        <p className="text-sm text-muted-foreground">تتحكم هنا في اسم المتجر وألوانه ونصوص الصفحة الرئيسية وبيانات التواصل.</p>
      </div>

      <Section title="هوية المتجر">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="اسم المتجر" required maxLength={30} value={b.storeName} onChange={(e) => set("storeName", e.target.value)} />
          <Field label="الشعار النصي (يظهر في التذييل)" maxLength={120} value={b.tagline} onChange={(e) => set("tagline", e.target.value)} />
          <Field label="نص حقوق النشر" maxLength={120} value={b.copyright} onChange={(e) => set("copyright", e.target.value)} />
        </div>
      </Section>

      <Section title="الألوان" hint="يُختار لون النص على كل لون تلقائيًا ليبقى واضحًا.">
        <div className="grid gap-3 md:grid-cols-2">
          {(Object.keys(colorLabels) as (keyof Brand["colors"])[]).map((k) => (
            <label key={k} className="flex items-center gap-3 text-sm font-bold">
              <input type="color" aria-label={colorLabels[k]} value={b.colors[k]} onChange={(e) => sub("colors", k, e.target.value.toUpperCase())} className="h-10 w-14 cursor-pointer rounded border bg-background" />
              <span className="flex-1">{colorLabels[k]}<span dir="ltr" className="block text-xs font-normal text-muted-foreground">{b.colors[k]}</span></span>
            </label>
          ))}
        </div>
        {weak && <p role="alert" className="text-sm font-bold text-destructive">النص الداكن غير واضح على لون الخلفية المختار. اختر خلفية أفتح أو لونًا داكنًا أغمق.</p>}
        <div className="overflow-hidden rounded-lg border" aria-label="معاينة الألوان">
          <style>{brandCss(b).replace(":root", ".brand-preview")}</style>
          <div className="brand-preview">
            <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground"><span className="text-xl font-black">{b.storeName || "—"}<span className="text-accent">.</span></span><span className="text-xs">معاينة</span></div>
            <div className="flex flex-wrap items-center gap-3 bg-background p-4 text-foreground">
              <span className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">تسوق الآن</span>
              <span className="rounded bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">-٢٠٪</span>
              <span className="text-sm font-bold text-accent">عرض الكل</span>
            </div>
            <div className="bg-secondary px-4 py-3 text-sm text-secondary-foreground">{b.tagline || "التذييل"}</div>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => set("colors", DEFAULT_BRAND.colors)}>استعادة الألوان الأصلية</Button>
      </Section>

      <Section title="شريط الإعلانات" hint="شريط يظهر أعلى كل صفحات المتجر، مثل «شحن مجاني اليوم فقط».">
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={b.announcement.enabled} onChange={(e) => sub("announcement", "enabled", e.target.checked)} className="size-4" />إظهار الشريط</label>
        <Field label="نص الإعلان" maxLength={160} value={b.announcement.text} onChange={(e) => sub("announcement", "text", e.target.value)} />
      </Section>

      <Section title="بنرات الصفحة الرئيسية" hint="ثلاث شرائح متحركة. اترك العنوان فارغًا لإخفاء الشريحة.">
        {b.slides.map((s, i) => (
          <div key={i} className="grid gap-3 rounded-md bg-muted/50 p-3 md:grid-cols-3">
            <p className="text-sm font-black md:col-span-3">الشريحة {i + 1}</p>
            {(["badge", "title", "text"] as const).map((f) => (
              <Field key={f} label={{ badge: "الشارة", title: "العنوان", text: "الوصف" }[f]} maxLength={{ badge: 40, title: 80, text: 160 }[f]} value={s[f]}
                onChange={(e) => set("slides", b.slides.map((x, j) => (j === i ? { ...x, [f]: e.target.value } : x)))} />
            ))}
          </div>
        ))}
      </Section>

      <Section title="مزايا المتجر" hint="تظهر أسفل الأقسام في الرئيسية. ميزة التوصيل المجاني تتبع إعدادات التوصيل تلقائيًا.">
        <div className="grid gap-3 md:grid-cols-2">
          {b.badges.map((t, i) => <Field key={i} label={`الميزة ${i + 1}`} maxLength={60} value={t} onChange={(e) => set("badges", b.badges.map((x, j) => (j === i ? e.target.value : x)))} />)}
        </div>
      </Section>

      <Section title="التواصل والتواصل الاجتماعي" hint="تظهر في تذييل كل الصفحات. اترك أي حقل فارغًا لإخفائه.">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="رقم الهاتف" dir="ltr" inputMode="tel" maxLength={30} value={b.contact.phone} onChange={(e) => sub("contact", "phone", e.target.value)} />
          <Field label="رقم واتساب" dir="ltr" inputMode="tel" maxLength={30} placeholder="201xxxxxxxxx" value={b.contact.whatsapp} onChange={(e) => sub("contact", "whatsapp", e.target.value)} />
          <Field label="البريد الإلكتروني" dir="ltr" type="email" maxLength={120} value={b.contact.email} onChange={(e) => sub("contact", "email", e.target.value)} />
          <Field label="رابط فيسبوك" dir="ltr" type="url" placeholder="https://facebook.com/..." value={b.social.facebook} onChange={(e) => sub("social", "facebook", e.target.value)} />
          <Field label="رابط إنستجرام" dir="ltr" type="url" placeholder="https://instagram.com/..." value={b.social.instagram} onChange={(e) => sub("social", "instagram", e.target.value)} />
          <Field label="رابط تيك توك" dir="ltr" type="url" placeholder="https://tiktok.com/@..." value={b.social.tiktok} onChange={(e) => sub("social", "tiktok", e.target.value)} />
        </div>
      </Section>

      <div className="sticky bottom-0 flex justify-end border-t bg-background py-3">
        <Button type="submit" disabled={busy} className="font-bold">{busy ? "جارٍ الحفظ..." : "حفظ الهوية"}</Button>
      </div>
    </form>
  );
}
