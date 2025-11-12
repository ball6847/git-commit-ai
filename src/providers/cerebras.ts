import { createCerebras } from '@ai-sdk/cerebras';
import type { ModelRecord } from '../types.ts';

const providerId = 'cerebras';

function getCerebrasProvider() {
  return createCerebras({
    apiKey: Deno.env.get('CEREBRAS_API_KEY') || '',
  });
}

export const cerebrasModels: ModelRecord = {
  [`${providerId}/zai-glm-4.6`]: getCerebrasProvider()('zai-glm-4.6'),
};
