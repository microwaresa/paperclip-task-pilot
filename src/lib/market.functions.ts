import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { SELLER_PRODUCT_COLUMNS, toProduct, type SellerProductRow } from "./market";

const filter = z.object({
  category: z.string().max(40).optional(),
  q: z.string().max(100).optional(),
  ids: z.array(z.string().uuid()).max(60).optional(),
});

/** Live products from approved sellers (public). */
export const getSellerProducts = createServerFn({ method: "GET" })
  .inputValidator((i: z.input<typeof filter>) => filter.parse(i))
  .handler(async ({ data }) => {
    const { publicDb } = await import("./public-db.server");
    let q = publicDb().from("merchant_products").select(SELLER_PRODUCT_COLUMNS).eq("merchants.status", "approved").eq("active", true).limit(100);
    if (data.category) q = q.eq("category", data.category);
    if (data.ids) { if (data.ids.length === 0) return []; q = q.in("id", data.ids); }
    if (data.q?.trim()) {
      const term = data.q.trim().replace(/[%,()*]/g, " ");
      q = q.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
    }
    const { data: rows, error } = await q.order("created_at", { ascending: false });
    if (error) { console.error("seller products", error); return []; }
    return (rows as unknown as SellerProductRow[]).map(toProduct);
  });

export const sellerProductsQuery = (f: z.input<typeof filter>) =>
  queryOptions({ queryKey: ["seller-products", f], queryFn: () => getSellerProducts({ data: f }), staleTime: 30_000 });

export const getSellerProduct = createServerFn({ method: "GET" })
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { publicDb } = await import("./public-db.server");
    const { data: row } = await publicDb().from("merchant_products").select(SELLER_PRODUCT_COLUMNS)
      .eq("id", data.id).eq("merchants.status", "approved").eq("active", true).maybeSingle();
    return row ? toProduct(row as unknown as SellerProductRow) : null;
  });

export const getStore = createServerFn({ method: "GET" })
  .inputValidator((i: { slug: string }) => z.object({ slug: z.string().max(40) }).parse(i))
  .handler(async ({ data }) => {
    const { publicDb } = await import("./public-db.server");
    const db = publicDb();
    const { data: store } = await db.from("merchants").select("id, store_name, slug, description, created_at").eq("slug", data.slug).eq("status", "approved").maybeSingle();
    if (!store) return null;
    const { data: rows } = await db.from("merchant_products").select(SELLER_PRODUCT_COLUMNS).eq("merchant_id", store.id).eq("active", true).order("created_at", { ascending: false });
    return { store, products: ((rows ?? []) as unknown as SellerProductRow[]).map(toProduct) };
  });
