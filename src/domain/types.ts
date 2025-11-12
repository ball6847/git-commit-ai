import type { LanguageModelV2 } from "@ai-sdk/provider";

// Record of model name to LanguageModelV2, where key is model id with provider prefix. for example "zai-coding-plan/glm-4.6"
export type ModelRecord = Record<string, LanguageModelV2>;

export interface ProviderWithModels {
  name: string;
  models: LanguageModelV2[];
}
