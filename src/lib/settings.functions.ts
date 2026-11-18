import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_DELIVERY } from "./pricing";
import { DEFAULT_BRAND } from "./brand";

export const getDeliverySettings = createServerFn({ method: "GET" }).handler(async () => {
  const { readDeliverySettings } = await import("./settings.server");
  return readDeliverySettings();
});

export const deliveryQuery = queryOptions({
  queryKey: ["delivery-settings"],
  queryFn: () => getDeliverySettings(),
  placeholderData: DEFAULT_DELIVERY,
  staleTime: 60_000,
});

export const getBrand = createServerFn({ method: "GET" }).handler(async () => {
  const { readBrand } = await import("./settings.server");
  return readBrand();
});

export const brandQuery = queryOptions({
  queryKey: ["brand"],
  queryFn: () => getBrand(),
  placeholderData: DEFAULT_BRAND,
  staleTime: 60_000,
});
