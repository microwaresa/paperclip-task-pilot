import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getMyMerchant, listMyOrderLines } from "./merchant.functions";

const SEEN_KEY = "seen-seller-orders-seen-at";
const SEEN_EVENT = "seen-seller-orders-seen";

/** Lines newer than this time count as "new" for the seller. */
function useSeenAt() {
  const [seenAt, setSeenAt] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setSeenAt(localStorage.getItem(SEEN_KEY) ?? new Date(0).toISOString());
    read();
    window.addEventListener(SEEN_EVENT, read);
    window.addEventListener("storage", read);
    return () => { window.removeEventListener(SEEN_EVENT, read); window.removeEventListener("storage", read); };
  }, []);
  return seenAt;
}

export function markSellerOrdersSeen() {
  localStorage.setItem(SEEN_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(SEEN_EVENT));
}

export const countNew = (lines: { created_at: string }[], seenAt: string | null) =>
  seenAt ? new Set(lines.filter((l) => l.created_at > seenAt).map((l) => (l as { order_id?: string }).order_id ?? l.created_at)).size : 0;

/** Approved seller's merchant row (null for shoppers). */
export function useMyApprovedMerchant() {
  const { user } = useAuth();
  const m = useQuery({ queryKey: ["my-merchant"], queryFn: () => getMyMerchant(), enabled: !!user, staleTime: 60_000 }).data;
  return user && m?.status === "approved" ? m : null;
}

/** Live alert + header bell: tells the seller the moment an order for them arrives. */
export function SellerBell() {
  const merchant = useMyApprovedMerchant();
  const qc = useQueryClient();
  const seenAt = useSeenAt();
  const lines = useQuery({ queryKey: ["my-order-lines"], queryFn: () => listMyOrderLines(), enabled: !!merchant, refetchInterval: 30_000 }).data ?? [];
  const fresh = countNew(lines, seenAt);

  useEffect(() => {
    if (!merchant) return;
    const channel = supabase
      .channel(`seller-orders-${merchant.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items", filter: `merchant_id=eq.${merchant.id}` }, (payload) => {
        const row = payload.new as { name?: string; qty?: number };
        toast.success("طلب جديد على متجرك 🎉", { description: row.name ? `${row.name} × ${row.qty ?? 1}` : undefined });
        qc.invalidateQueries({ queryKey: ["my-order-lines"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_items", filter: `merchant_id=eq.${merchant.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["my-order-lines"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [merchant?.id, qc]);

  useEffect(() => {
    if (!merchant) return;
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = fresh > 0 ? `(${fresh}) ${base}` : base;
  }, [fresh, merchant]);

  if (!merchant) return null;
  return (
    <Link to="/merchant" aria-label={fresh ? `${fresh} طلبات جديدة` : "إشعارات الطلبات"} className="relative">
      <Bell className="h-5 w-5" />
      {fresh > 0 && <span className="absolute -top-2 -right-2 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-black leading-4 text-destructive-foreground">{fresh > 99 ? "99+" : fresh}</span>}
    </Link>
  );
}

export { useSeenAt };
