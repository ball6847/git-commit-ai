import { createAnthropic } from '@ai-sdk/anthropic';
import type { ModelRecord } from '../types.ts';

const providerId = 'kimi';

export function getKimiModels(): ModelRecord {
  const kimi = createAnthropic({
    baseURL: 'https://api.kimi.com/coding/v1',
    apiKey: Deno.env.get('KIMI_API_KEY') || '',
  });

  return {
    [`${providerId}/kimi-for-coding`]: kimi('kimi-for-coding'),
  };
}
