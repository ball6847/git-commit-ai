import { createAnthropic } from "@ai-sdk/anthropic";
import type { ModelRecord } from "../domain/types.ts";

const providerId = "kimi";

const kimi = createAnthropic({
  baseURL: "https://api.kimi.com/coding/v1",
  apiKey: Deno.env.get("KIMI_API_KEY") || "",
});

export const kimiModels: ModelRecord = {
  [`${providerId}/kimi-for-coding`]: kimi("kimi-for-coding"),
};
