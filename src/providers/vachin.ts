// TODO: add vachin based on the following configuration: using openai-compatible

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ModelRecord } from '../types.ts';

const providerId = 'vachin';

export function getVachinModels(): ModelRecord {
  const endpoints = {
    'KAT-Coder-Pro': Deno.env.get('VC_KAT_CODER_PRO_ENDPOINT') || '',
    'KAT-Coder-Air': Deno.env.get('VC_KAT_CODER_AIR_ENDPOINT') || '',
  };

  const vachin = createOpenAICompatible({
    name: providerId,
    baseURL: 'https://vanchin.streamlake.ai/api/gateway/v1/endpoints',
    apiKey: Deno.env.get('VC_API_KEY') || '',
  });

  return {
    [`${providerId}/kat-coder-pro`]: vachin(endpoints['KAT-Coder-Pro']),
    [`${providerId}/kat-coder-air`]: vachin(endpoints['KAT-Coder-Air']),
  };
}
