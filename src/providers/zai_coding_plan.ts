import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ModelRecord } from '../types.ts';

const providerId = 'zai-coding-plan';

export async function getZaiCodingPlanModels(): Promise<ModelRecord> {
  const zai = createOpenAICompatible({
    name: providerId,
    apiKey: Deno.env.get('ZAI_API_KEY') || '',
    baseURL: 'https://api.z.ai/api/coding/paas/v4',
  });

  return {
    [`${providerId}/glm-4.6`]: zai('glm-4.6'),
    [`${providerId}/glm-4.5`]: zai('glm-4.5'),
    [`${providerId}/glm-4.5-air`]: zai('glm-4.5-air'),
    [`${providerId}/glm-4.5-flash`]: zai('glm-4.5-flash'),
  };
}
