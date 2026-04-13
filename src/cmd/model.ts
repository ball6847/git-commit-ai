import { getAvailableProviders, getModelsDevData, mergeCustomProviders } from '../models-dev.ts';

import { bold, cyan, dim, green, red } from '@std/fmt/colors';

async function resolveCustomProviders() {
  const data = await getModelsDevData();

  let customProviders: Record<string, unknown> | undefined = undefined;
  try {
    const { loadConfig } = await import('../config.ts');
    const configResult = await loadConfig();
    if (configResult.ok && configResult.value) {
      customProviders = configResult.value.providers;
    }
  } catch {
    customProviders = undefined;
  }

  if (!customProviders || Object.keys(customProviders).length === 0) {
    return data;
  }

  return mergeCustomProviders(data, customProviders);
}

export async function handleModel() {
  console.log(cyan(bold('\n🤖 Available AI Models\n')));

  const data = await resolveCustomProviders();

  if (Object.keys(data).length === 0) {
    console.log(red('Could not fetch models.dev data. Check your network connection.'));
    return;
  }

  const available = getAvailableProviders(data);
  const availableIds = new Set(available.map((p) => p.id));

  for (const [providerId, provider] of Object.entries(data)) {
    const isAvailable = availableIds.has(providerId);
    const status = isAvailable ? green('✓') : red('✗');
    const models = Object.values(provider.models);

    console.log(`${status} ${bold(provider.name)} (${providerId})`);

    for (const model of models) {
      const modelRef = `${providerId}/${model.id}`;
      const features: string[] = [];
      if (model.reasoning) features.push('reasoning');
      if (model.tool_call) features.push('tools');
      if (model.attachment) features.push('attachments');

      const featureStr = features.length > 0 ? dim(` [${features.join(', ')}]`) : '';
      console.log(`  ${modelRef}${featureStr}`);
    }
    console.log('');
  }

  console.log(dim('Set API key environment variables to enable providers.'));
  console.log(dim('Use: git-commit-ai generate --model provider/model-id'));
}
