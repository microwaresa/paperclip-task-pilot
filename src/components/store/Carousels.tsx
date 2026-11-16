import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

export type Slide = { img: string; badge: string; title: string; text: string; cta: ReactNode };

/** Auto-playing banner carousel with dots (pauses on hover). */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [ref, api] = useEmblaCarousel({ loop: true, direction: "rtl" });
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!api) return;
    const on = () => setIndex(api.selectedScrollSnap());
    api.on("select", on);
    return () => { api.off("select", on); };
  }, [api]);
  useEffect(() => {
    if (!api || paused) return;
    const t = setInterval(() => api.scrollNext(), 5000);
    return () => clearInterval(t);
  }, [api, paused]);
  return (
    <section className="relative overflow-hidden rounded-lg" aria-roledescription="carousel" aria-label="العروض المميزة" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div ref={ref} className="overflow-hidden">
        <div className="flex">
          {slides.map((s, i) => (
            <div key={s.title} className="relative min-w-0 flex-[0_0_100%]" aria-roledescription="slide" aria-label={`${i + 1} من ${slides.length}`}>
              <img src={s.img} alt="" width={1600} height={640} loading={i ? "lazy" : "eager"} className="h-56 w-full object-cover md:h-80" />
              <div className="absolute inset-y-0 right-0 flex flex-col justify-center gap-3 bg-gradient-to-l from-secondary/85 to-transparent p-8 text-secondary-foreground md:w-1/2">
                <span className="w-fit rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{s.badge}</span>
                {i === 0 ? <h1 className="text-3xl font-black md:text-5xl">{s.title}</h1> : <h2 className="text-3xl font-black md:text-5xl">{s.title}</h2>}
                <p className="text-sm md:text-base">{s.text}</p>
                {s.cta}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ArrowButtons onPrev={() => api?.scrollPrev()} onNext={() => api?.scrollNext()} />
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((s, i) => <button key={s.title} aria-label={`الشريحة ${i + 1}`} aria-current={i === index} onClick={() => api?.scrollTo(i)} className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2 bg-card/70"}`} />)}
      </div>
    </section>
  );
}

function ArrowButtons({ onPrev, onNext, canPrev = true, canNext = true }: { onPrev: () => void; onNext: () => void; canPrev?: boolean; canNext?: boolean }) {
  const cls = "absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-card p-2 text-foreground shadow-md transition hover:bg-primary disabled:opacity-0 md:block";
  return (
    <>
      <button aria-label="السابق" disabled={!canPrev} onClick={onPrev} className={`${cls} right-2`}><ChevronRight className="h-5 w-5" /></button>
      <button aria-label="التالي" disabled={!canNext} onClick={onNext} className={`${cls} left-2`}><ChevronLeft className="h-5 w-5" /></button>
    </>
  );
}

/** Horizontally scrolling product row with arrows (noon-style). */
export function ProductCarousel({ title, items, action }: { title: string; items: Product[]; action?: ReactNode }) {
  const [ref, api] = useEmblaCarousel({ direction: "rtl", align: "start", slidesToScroll: "auto", containScroll: "trimSnaps" });
  const [can, setCan] = useState({ prev: false, next: false });
  const update = useCallback(() => { if (api) setCan({ prev: api.canScrollPrev(), next: api.canScrollNext() }); }, [api]);
  useEffect(() => {
    if (!api) return;
    update();
    api.on("select", update).on("reInit", update);
    return () => { api.off("select", update).off("reInit", update); };
  }, [api, update]);
  if (!items.length) return null;
  return (
    <section className="rounded-lg bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-black">{title}</h2>
        {action}
      </div>
      <div className="relative">
        <div ref={ref} className="overflow-hidden">
          <div className="-ms-3 flex">
            {items.map((p) => <div key={p.id} className="min-w-0 flex-[0_0_50%] ps-3 sm:flex-[0_0_33.33%] lg:flex-[0_0_20%]"><ProductCard p={p} /></div>)}
          </div>
        </div>
        <ArrowButtons canPrev={can.prev} canNext={can.next} onPrev={() => api?.scrollPrev()} onNext={() => api?.scrollNext()} />
      </div>
    </section>
  );
}
