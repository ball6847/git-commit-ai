import type { ModelRecord } from "../domain/types.ts";
import { cerebrasModels } from "./cerebras.ts";
import { kimiModels } from "./kimi.ts";
import { ollamaCloudModels } from "./ollama_cloud.ts";
import { vachinModels } from "./vachin.ts";
import { zaiCodingPlanModels } from "./zai_coding_plan.ts";

export const models: ModelRecord = {
  ...cerebrasModels,
  ...kimiModels,
  ...ollamaCloudModels,
  ...vachinModels,
  ...zaiCodingPlanModels,
};

