import { getModelsDevData, getProviderApiKey, mergeCustomProviders } from '../models-dev.ts';
import { bold, cyan, dim, green, red } from '@std/fmt/colors';
import type { Logger, ModelsService } from '../services.ts';

export interface ModelDependencies {
  modelService?: ModelsService;
  logger?: Logger;
}

const defaultDeps: Required<ModelDependencies> = {
  modelService: {
    getModelsDevData,
    getProviderApiKey,
    mergeCustomProviders,
    loadConfig: async () => {
      const { loadConfig: realLoadConfig } = await import('../config.ts');
      return realLoadConfig();
    },
  },
  logger: globalThis.console,
};

export async function handleModel(deps: ModelDependencies = {}): Promise<void> {
  const {
    modelService = defaultDeps.modelService,
    logger = defaultDeps.logger,
  } = deps;

  logger.log(cyan(bold('\n🤖 Available AI Models\n')));

  const dataResult = await modelService.getModelsDevData();
  if (!dataResult.ok) {
    logger.log(red('Could not fetch models.dev data. Check your network connection.'));
    return;
  }
  const data = dataResult.value;

  const configResult = await modelService.loadConfig();
  const customProviders = (configResult.ok && configResult.value)
    ? configResult.value.providers
    : undefined;

  const mergedData = (!customProviders || Object.keys(customProviders).length === 0)
    ? data
    : modelService.mergeCustomProviders(data, customProviders);

  if (Object.keys(mergedData).length === 0) {
    logger.log(red('Could not fetch models.dev data. Check your network connection.'));
    return;
  }

  const availableIds = new Set<string>();
  for (const provider of Object.values(mergedData)) {
    const apiKey = modelService.getProviderApiKey(provider);
    if (apiKey !== null) {
      availableIds.add(provider.id);
    }
  }

  for (const [providerId, provider] of Object.entries(mergedData)) {
    const isAvailable = availableIds.has(providerId);
    const status = isAvailable ? green('✓') : red('✗');
    const models = Object.values(provider.models);

    logger.log(`${status} ${bold(provider.name)} (${providerId})`);

    for (const model of models) {
      const modelRef = `${providerId}/${model.id}`;
      const features: string[] = [];
      if (model.reasoning) features.push('reasoning');
      if (model.tool_call) features.push('tools');
      if (model.attachment) features.push('attachments');

      const featureStr = features.length > 0 ? dim(` [${features.join(', ')}]`) : '';
      logger.log(`  ${modelRef}${featureStr}`);
    }
    logger.log('');
  }

  logger.log(dim('Set API key environment variables to enable providers.'));
  logger.log(dim('Use: git-commit-ai generate --model provider/model-id'));
}
