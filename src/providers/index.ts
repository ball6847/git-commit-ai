import type { ModelRecord } from '../types.ts';
import { getCerebrasModels } from './cerebras.ts';
import { getKimiModels } from './kimi.ts';
import { getOllamaCloudModels } from './ollama_cloud.ts';
import { getOpenRouterModels } from './openrouter.ts';
import { getVachinModels } from './vachin.ts';
import { getZaiCodingPlanModels } from './zai_coding_plan.ts';

// Lazy-load models only when needed
export async function getModels(): Promise<ModelRecord> {
  const [
    cerebrasModels,
    kimiModels,
    ollamaCloudModels,
    openrouterModels,
    vachinModels,
    zaiCodingPlanModels,
  ] = await Promise.all([
    getCerebrasModels(),
    getKimiModels(),
    getOllamaCloudModels(),
    getOpenRouterModels(),
    getVachinModels(),
    getZaiCodingPlanModels(),
  ]);

  return {
    ...cerebrasModels,
    ...kimiModels,
    ...ollamaCloudModels,
    ...openrouterModels,
    ...vachinModels,
    ...zaiCodingPlanModels,
  };
}

// Export available model keys dynamically without initializing providers
export async function getModelKeys(): Promise<string[]> {
  const models = await getModels();
  return Object.keys(models);
}
