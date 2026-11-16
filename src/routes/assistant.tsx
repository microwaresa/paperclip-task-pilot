import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { getProduct } from "@/lib/catalog";
import { getRecommendations, type AssistantResult } from "@/lib/assistant.functions";
import { StoreLayout } from "@/components/store/StoreLayout";
import { ProductCard } from "@/components/store/ProductCard";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "مساعد التسوق الذكي | سين" },
      { name: "description", content: "اكتب ما تحتاجه وميزانيتك، ويرشّح لك مساعد سين الذكي المنتجات المناسبة." },
      { property: "og:title", content: "مساعد التسوق الذكي | سين" },
      { property: "og:description", content: "صف احتياجك واحصل على ترشيحات منتجات فورية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

const examples = ["هدية لأخويا بيحب الرياضة في حدود ٣٠٠٠ جنيه", "لابتوب للدراسة مش غالي", "حاجة للمطبخ تحت ١٠٠٠ جنيه", "سماعة كويسة للمواصلات"];

function AssistantPage() {
  const ask = useServerFn(getRecommendations);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AssistantResult | null>(null);

  const run = async (q: string) => {
    const text = q.trim();
    if (text.length < 3 || busy) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(await ask({ data: { query: text } }));
    } catch {
      setResult({ ok: false, error: "تعذر الاتصال بالمساعد، حاول مرة أخرى." });
    } finally {
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); void run(query); };

  return (
    <StoreLayout>
      <section className="rounded-lg bg-secondary p-6 text-secondary-foreground">
        <div className="flex items-center gap-2 text-primary"><Sparkles className="h-6 w-6" /><span className="text-sm font-bold">مدعوم بالذكاء الاصطناعي</span></div>
        <h1 className="mt-2 text-3xl font-black">مساعد التسوق الذكي</h1>
        <p className="mt-1 text-sm opacity-80">اكتب بتدوّر على إيه، لمين، وميزانيتك كام، وهنرشّح لك الأنسب من منتجات سين.</p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void run(query); } }}
            maxLength={500}
            rows={3}
            aria-label="صف ما تحتاجه"
            placeholder="مثال: محتاج ساعة ذكية لمتابعة الجري في حدود ٤٠٠٠ جنيه"
            className="w-full rounded-md bg-card p-3 text-sm text-foreground outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button disabled={busy || query.trim().length < 3} className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-black text-primary-foreground disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy ? "بندوّر لك..." : "رشّح لي"}
            </button>
            {examples.map((ex) => (
              <button type="button" key={ex} disabled={busy} onClick={() => { setQuery(ex); void run(ex); }} className="rounded-full border border-secondary-foreground/30 px-3 py-1 text-xs hover:bg-secondary-foreground/10">{ex}</button>
            ))}
          </div>
        </form>
      </section>

      {result && !result.ok && <div role="alert" className="rounded-lg bg-card p-4 font-bold text-destructive">{result.error}</div>}
      {result?.ok && (
        <section className="space-y-4 rounded-lg bg-card p-4" aria-live="polite">
          <p className="font-bold">{result.intro}</p>
          {result.picks.length === 0 ? (
            <Link to="/search" search={{ q: "", sort: "relevance" }} className="inline-block rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground">تصفح كل المنتجات</Link>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {result.picks.map((pick) => {
                const p = getProduct(pick.id);
                return p ? (
                  <div key={p.id} className="flex flex-col gap-2">
                    <ProductCard p={p} />
                    <p className="rounded-md bg-muted p-2 text-xs leading-relaxed"><Sparkles className="ml-1 inline h-3 w-3 text-accent" />{pick.reason}</p>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </section>
      )}
    </StoreLayout>
  );
}
