import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ModelRecord } from '../types.ts';

const providerId = 'ollama-cloud';

const ollamaCloud = createOpenAICompatible({
  name: providerId,
  apiKey: Deno.env.get('OLLAMA_API_KEY') || '',
  baseURL: 'https://ollama.com/v1',
});

export const ollamaCloudModels: ModelRecord = {
  [`${providerId}/deepseek-v3.1:671b`]: ollamaCloud('deepseek-v3.1:671b'),
  [`${providerId}/gpt-oss:20b`]: ollamaCloud('gpt-oss:20b'),
  [`${providerId}/gpt-oss:120b`]: ollamaCloud('gpt-oss:120b'),
  [`${providerId}/kimi-k2:1t`]: ollamaCloud('kimi-k2:1t'),
  [`${providerId}/qwen3-coder:480b`]: ollamaCloud('qwen3-coder:480b'),
  [`${providerId}/glm-4.6`]: ollamaCloud('glm-4.6'),
  [`${providerId}/minimax-m2`]: ollamaCloud('minimax-m2'),
  [`${providerId}/kimi-k2-thinking`]: ollamaCloud('kimi-k2-thinking'),
};
