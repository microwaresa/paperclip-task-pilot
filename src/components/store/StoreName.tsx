import { useQuery } from "@tanstack/react-query";
import { brandQuery } from "@/lib/settings.functions";
import { DEFAULT_BRAND } from "@/lib/brand";

/** The admin-configured store name, for use inside text. */
export function StoreName() {
  return <>{useQuery(brandQuery).data?.storeName ?? DEFAULT_BRAND.storeName}</>;
}
