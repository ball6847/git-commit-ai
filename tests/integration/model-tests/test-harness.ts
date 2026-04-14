import { handleModel, type ModelDependencies } from '../../../src/cmd/model.ts';
import type {
  ModelsDevModel,
  ModelsDevProvider,
  ModelsDevResponse,
} from '../../../src/models-dev.ts';
import { Result } from 'typescript-result';
import type { ConfigFile } from '../../../src/types.ts';
import type { ModelsService } from '../../../src/services.ts';

export interface ModelHarness {
  logs: string[];
  errors: string[];
  run(
    overrides?: { modelService?: Partial<ModelsService>; logger?: ModelDependencies['logger'] },
  ): Promise<void>;
}

export function createModelHarness(mockData: ModelsDevResponse): ModelHarness {
  const logs: string[] = [];
  const errors: string[] = [];

  function run(
    overrides: { modelService?: Partial<ModelsService>; logger?: ModelDependencies['logger'] } = {},
  ): Promise<void> {
    logs.length = 0;
    errors.length = 0;

    const defaultModelService: ModelsService = {
      getModelsDevData: () => Promise.resolve(Result.ok(mockData)),
      getProviderApiKey: () => null,
      mergeCustomProviders: (data, custom) => {
        const merged: ModelsDevResponse = { ...data };
        for (const [id, config] of Object.entries(custom)) {
          const cfg = config as Record<string, unknown>;
          const modelsCfg = cfg['models'] as Record<string, unknown> | undefined;
          if (!modelsCfg) {
            continue;
          }
          const modelsMap: Record<string, ModelsDevModel> = {};
          for (const [modelId, modelUnknown] of Object.entries(modelsCfg)) {
            const m = modelUnknown as Record<string, unknown>;
            modelsMap[modelId] = {
              id: modelId,
              name: String(m['name']),
              attachment: !!m['attachment'],
              reasoning: !!m['reasoning'],
              tool_call: !!m['tool_call'],
              temperature: !!m['temperature'],
            };
          }
          const envArr = Array.isArray(cfg['env']) ? cfg['env'] as string[] : [];
          const npmStr = typeof cfg['npm'] === 'string'
            ? cfg['npm'] as string
            : '@ai-sdk/openai-compatible';
          const apiStr = typeof cfg['api'] === 'string' ? cfg['api'] as string : undefined;
          merged[id] = {
            id,
            name: id,
            env: envArr,
            npm: npmStr,
            api: apiStr,
            models: modelsMap,
          } as ModelsDevProvider;
        }
        return merged;
      },
      loadConfig: () => Promise.resolve(Result.ok({} as ConfigFile)),
    };

    const defaultLogger = {
      log: (...args: unknown[]) => {
        logs.push(args.map(String).join(' '));
      },
      error: (...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
      },
    };

    const deps: ModelDependencies = {
      modelService: {
        ...defaultModelService,
        ...overrides.modelService,
      },
      logger: overrides.logger ?? defaultLogger,
    };

    return handleModel(deps);
  }

  return { logs, errors, run };
}
