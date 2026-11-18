import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_DELIVERY, type DeliverySettings } from "./pricing";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  return client;
}

export async function readBrand() {
  const { resolveBrand } = await import("./brand");
  const { data } = await publicClient().from("store_settings").select("brand").eq("id", 1).maybeSingle();
  return resolveBrand(data?.brand);
}

export async function readDeliverySettings(): Promise<DeliverySettings> {
  const { data } = await publicClient().from("store_settings").select("shipping_fee, free_shipping_min, payout_hold_days").eq("id", 1).maybeSingle();
  return data ? { shippingFee: data.shipping_fee, freeShippingMin: data.free_shipping_min, payoutHoldDays: data.payout_hold_days } : DEFAULT_DELIVERY;
}
