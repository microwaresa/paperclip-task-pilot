import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_DELIVERY } from "./pricing";

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
