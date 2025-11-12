import type { ModelRecord } from '../types.ts';
import { getCerebrasModels } from './cerebras.ts';
import { getKimiModels } from './kimi.ts';
import { getOllamaCloudModels } from './ollama_cloud.ts';
import { getVachinModels } from './vachin.ts';
import { getZaiCodingPlanModels } from './zai_coding_plan.ts';

// Lazy-load models only when needed
export function getModels(): ModelRecord {
  return {
    ...getCerebrasModels(),
    ...getKimiModels(),
    ...getOllamaCloudModels(),
    ...getVachinModels(),
    ...getZaiCodingPlanModels(),
  };
}

// Export available model keys dynamically without initializing providers
export function getModelKeys(): string[] {
  return Object.keys(getModels());
}
