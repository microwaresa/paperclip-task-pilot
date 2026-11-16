import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ query: z.string().trim().min(3).max(500) });

export type AssistantResult =
  | { ok: true; intro: string; picks: { id: string; reason: string }[] }
  | { ok: false; error: string };

export const getRecommendations = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof input>) => input.parse(data))
  .handler(async ({ data }): Promise<AssistantResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "المساعد غير مُعدّ حاليًا." };
    const { recommend, AiError } = await import("./ai/recommend.server");
    try {
      const r = await recommend(data.query, apiKey);
      return { ok: true, ...r };
    } catch (e) {
      return { ok: false, error: e instanceof AiError ? e.message : "حدث خطأ، حاول مرة أخرى." };
    }
  });
