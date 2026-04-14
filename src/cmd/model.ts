import { getModelsDevData, getProviderApiKey, mergeCustomProviders } from '../models-dev.ts';
import type { ModelsDevResponse } from '../models-dev.ts';
import { bold, cyan, dim, green, red } from '@std/fmt/colors';
import type { Result } from '../result.ts';
import type { ConfigFile } from '../types.ts';

export interface ModelDependencies {
  getModelsDevData?: () => Promise<ModelsDevResponse>;
  getProviderApiKey?: (provider: Parameters<typeof getProviderApiKey>[0]) => string | null;
  mergeCustomProviders?: typeof mergeCustomProviders;
  loadConfig?: () => Promise<Result<ConfigFile, Error>>;
  logger?: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

type DepsLogger = NonNullable<ModelDependencies['logger']>;

const defaultDeps: {
  getModelsDevData: () => Promise<ModelsDevResponse>;
  getProviderApiKey: (provider: Parameters<typeof getProviderApiKey>[0]) => string | null;
  mergeCustomProviders: typeof mergeCustomProviders;
  loadConfig: () => Promise<Result<ConfigFile, Error>>;
  logger: DepsLogger;
} = {
  getModelsDevData,
  getProviderApiKey,
  mergeCustomProviders,
  loadConfig: async () => {
    const { loadConfig: realLoadConfig } = await import('../config.ts');
    return realLoadConfig();
  },
  logger: globalThis.console,
};

export async function handleModel(deps: ModelDependencies = {}): Promise<void> {
  const {
    getModelsDevData: fetchModelsDevData = defaultDeps.getModelsDevData,
    getProviderApiKey: resolveProviderApiKey = defaultDeps.getProviderApiKey,
    mergeCustomProviders: doMergeCustomProviders = defaultDeps.mergeCustomProviders,
    loadConfig: loadCfg = defaultDeps.loadConfig,
    logger = defaultDeps.logger,
  } = deps;

  logger.log(cyan(bold('\n🤖 Available AI Models\n')));

  const data = await fetchModelsDevData();

  let customProviders: Record<string, unknown> | undefined = undefined;
  try {
    const configResult = await loadCfg();
    if (configResult.ok && configResult.value) {
      customProviders = configResult.value.providers;
    }
  } catch {
    customProviders = undefined;
  }

  const mergedData = (!customProviders || Object.keys(customProviders).length === 0)
    ? data
    : doMergeCustomProviders(data, customProviders);

  if (Object.keys(mergedData).length === 0) {
    logger.log(red('Could not fetch models.dev data. Check your network connection.'));
    return;
  }

  const availableIds = new Set<string>();
  for (const provider of Object.values(mergedData)) {
    const apiKey = resolveProviderApiKey(provider);
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
