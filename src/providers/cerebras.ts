import { createCerebras } from "@ai-sdk/cerebras";
import type { ModelRecord } from "../domain/types.ts";

const providerId = "cerebras";

const cerebras = createCerebras({
  apiKey: Deno.env.get("CEREBRAS_API_KEY") || "",
});

export const cerebrasModels: ModelRecord = {
  [`${providerId}/zai-glm-4.6`]: cerebras("zai-glm-4.6"),
};
