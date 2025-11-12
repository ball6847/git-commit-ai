import { createCerebras } from '@ai-sdk/cerebras';
import type { ModelRecord } from '../types.ts';

const providerId = 'cerebras';

export async function getCerebrasModels(): Promise<ModelRecord> {
  const cerebras = createCerebras({
    apiKey: Deno.env.get('CEREBRAS_API_KEY') || '',
  });

  return {
    [`${providerId}/zai-glm-4.6`]: cerebras('zai-glm-4.6'),
  };
}
