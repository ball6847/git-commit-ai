import { getModelsDevData } from '../models-dev.ts';

import { bold, green, dim } from '@std/fmt/colors';

export async function handleModel() {
  console.log(green('🤖 Available AI Models\n'));

  const data = await getModelsDevData();

  if (Object.keys(data).length === 0) {
    console.log('Could not fetch models.dev data. Check your network connection.');
    return;
  }

  for (const providerId of Object.keys(data)) {
    const provider = data[providerId] as unknown as { name: string };
    if (!provider) continue;

    const features = new Set<string>();
    const providerData = data[providerId];
    if (providerData) {
      const models = (providerData as { models: Record<string, unknown> })?.models || {};
      for (const model of Object.values(models)) {
        const modelObj = model as unknown as { reasoning?: boolean; tool_call?: boolean };
        if (modelObj.reasoning) features.add('reasoning');
        if (modelObj.tool_call) features.add('tools');
      }
    }

    const featureStr = features.size > 0 ? dim(` [${[...features].join(', ')}]`) : '';
    console.log(`${green('✓')} ${bold(provider?.name || providerId)} (${providerId})${featureStr}`);
  }

  console.log(dim('Set API key environment variables to enable providers.'));
  console.log(dim('Use: git-commit-ai generate --model provider/model-id'));
}