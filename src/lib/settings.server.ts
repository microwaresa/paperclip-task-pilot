import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DEFAULT_DELIVERY, type DeliverySettings } from "./pricing";

export async function readDeliverySettings(): Promise<DeliverySettings> {
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
  const { data } = await client.from("store_settings").select("shipping_fee, free_shipping_min").eq("id", 1).maybeSingle();
  return data ? { shippingFee: data.shipping_fee, freeShippingMin: data.free_shipping_min } : DEFAULT_DELIVERY;
}
