import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

/** "Ends in 2d 04:13:09" for a timed offer; renders after mount to avoid hydration drift. */
export function SaleCountdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (now === null) return null;
  const left = new Date(endsAt).getTime() - now;
  if (left <= 0) return null;
  const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={`inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[11px] font-bold text-accent-foreground ${className}`}>
      <Timer className="h-3 w-3" />ينتهي خلال {d > 0 ? `${d} يوم ` : ""}<span dir="ltr">{pad(h)}:{pad(m)}:{pad(sec)}</span>
    </span>
  );
}
