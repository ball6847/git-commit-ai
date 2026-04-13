import { createAnthropic } from '@ai-sdk/anthropic';
import { createCerebras } from '@ai-sdk/cerebras';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { getCacheDir, getModelsCacheFile, migrateLegacyCache } from './paths.ts';

interface CustomModelsDevProvider extends ModelsDevProvider {
  isCustom: true;
  isExtended?: boolean;
}

export interface ModelsDevModel {
  id: string;
  name: string;
  attachment: boolean;
  reasoning: boolean;
  tool_call: boolean;
  temperature: boolean;
  cost?: { input: number; output: number; cache_read?: number; cache_write?: number };
  limit?: { context: number; output: number };
}

export interface ModelsDevProvider {
  id: string;
  name: string;
  env: string[];
  npm: string;
  api?: string;
  models: Record<string, ModelsDevModel>;
}

export type ModelsDevResponse = Record<string, ModelsDevProvider | CustomModelsDevProvider>;

export interface AvailableProvider {
  id: string;
  name: string;
  apiKey: string;
  npm: string;
  api?: string;
  models: ModelsDevModel[];
}

interface CachedModelsDev {
  data: ModelsDevResponse;
  timestamp: number;
}

const MODELS_DEV_API_URL = 'https://models.dev/api.json';
const DEFAULT_CACHE_TTL = 86400; // 24 hours in seconds

function getCacheTTL(): number {
  const envTTL = Deno.env.get('GIT_COMMIT_AI_CACHE_TTL');
  if (envTTL) {
    const parsed = parseInt(envTTL, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_CACHE_TTL;
}

async function loadCache(): Promise<CachedModelsDev | null> {
  await migrateLegacyCache();

  try {
    const raw = await Deno.readTextFile(getModelsCacheFile());
    const cached: CachedModelsDev = JSON.parse(raw);
    return cached;
  } catch {
    return null;
  }
}

async function saveCache(data: ModelsDevResponse): Promise<void> {
  await migrateLegacyCache();

  const cached: CachedModelsDev = {
    data,
    timestamp: Date.now(),
  };

  try {
    await Deno.mkdir(getCacheDir(), { recursive: true });
    await Deno.writeTextFile(getModelsCacheFile(), JSON.stringify(cached));
  } catch (error) {
    console.warn('Failed to save models.dev cache:', error);
  }
}

function isCacheValid(cached: CachedModelsDev): boolean {
  const ttlMs = getCacheTTL() * 1000;
  return Date.now() - cached.timestamp < ttlMs;
}

async function fetchFromApi(): Promise<ModelsDevResponse> {
  const response = await fetch(MODELS_DEV_API_URL);

  if (!response.ok) {
    throw new Error(`HTTP error fetching models.dev: ${response.status}`);
  }

  return await response.json();
}

export async function getModelsDevData(): Promise<ModelsDevResponse> {
  const cached = await loadCache();

  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const data = await fetchFromApi();
    await saveCache(data);
    return data;
  } catch (error) {
    console.warn('Failed to fetch models.dev data:', error);

    if (cached) {
      console.warn('Using stale cached data');
      return cached.data;
    }

    return {};
  }
}

export async function refreshModelsDevCache(): Promise<ModelsDevResponse> {
  try {
    const data = await fetchFromApi();
    await saveCache(data);
    return data;
  } catch (error) {
    console.warn('Failed to refresh models.dev cache:', error);

    const cached = await loadCache();
    if (cached) {
      return cached.data;
    }

    return {};
  }
}

export async function clearModelsDevCache(): Promise<void> {
  await migrateLegacyCache();

  try {
    await Deno.remove(getModelsCacheFile());
  } catch {
    console.warn('Models cache file does not exist');
  }
}

export function getProviderApiKey(provider: ModelsDevProvider): string | null {
  // Providers with empty env array don't require API keys (e.g., local Ollama)
  if (provider.env.length === 0) {
    return '';
  }
  for (const envVar of provider.env) {
    const value = Deno.env.get(envVar);
    if (value) return value;
  }
  return null;
}

export function getAvailableProviders(data: ModelsDevResponse): AvailableProvider[] {
  const providers: AvailableProvider[] = [];
  for (const provider of Object.values(data)) {
    const apiKey = getProviderApiKey(provider);
    if (apiKey === null) continue;
    providers.push({
      id: provider.id,
      name: provider.name,
      apiKey,
      npm: provider.npm,
      api: provider.api,
      models: Object.values(provider.models),
    });
  }
  return providers;
}

export function isProviderAvailable(data: ModelsDevResponse, providerId: string): boolean {
  const provider = data[providerId];
  if (!provider) return false;
  return getProviderApiKey(provider) !== null;
}

interface SDKProvider {
  languageModel: (modelId: string) => LanguageModel;
}

const BUNDLED_SDK_FACTORIES: Record<
  string,
  (opts: { apiKey: string; baseURL?: string }) => SDKProvider
> = {
  '@ai-sdk/anthropic': (opts) => createAnthropic(opts),
  '@ai-sdk/cerebras': (opts) => createCerebras(opts),
  '@ai-sdk/mistral': (opts) => createMistral(opts),
  '@ai-sdk/openai': (opts) => createOpenAI(opts),
  '@ai-sdk/openai-compatible': (opts) =>
    createOpenAICompatible({
      apiKey: opts.apiKey,
      baseURL: opts.baseURL ?? '',
      name: 'openai-compatible',
    }),
  '@openrouter/ai-sdk-provider': (opts) => createOpenRouter(opts) as unknown as SDKProvider,
};

const sdkCache = new Map<string, SDKProvider>();

export function getProviderSDK(provider: AvailableProvider): SDKProvider {
  const cacheKey = `${provider.npm}:${provider.apiKey}`;

  if (sdkCache.has(cacheKey)) {
    return sdkCache.get(cacheKey)!;
  }

  const factory = BUNDLED_SDK_FACTORIES[provider.npm];
  if (!factory) {
    if (provider.api) {
      const sdk = createOpenAICompatible({
        apiKey: provider.apiKey,
        baseURL: provider.api,
        name: provider.id,
      });
      sdkCache.set(cacheKey, sdk);
      return sdk;
    }
    throw new Error(
      `Provider "${provider.id}" uses npm package "${provider.npm}" which is not bundled. ` +
        `Supported: ${Object.keys(BUNDLED_SDK_FACTORIES).join(', ')}`,
    );
  }

  const opts: { apiKey: string; baseURL?: string } = { apiKey: provider.apiKey };
  if (provider.api && provider.npm === '@ai-sdk/openai-compatible') {
    opts.baseURL = provider.api;
  }

  const sdk = factory(opts);
  sdkCache.set(cacheKey, sdk);
  return sdk;
}

export function getModelFromProvider(
  provider: AvailableProvider,
  modelId: string,
): LanguageModel {
  const sdk = getProviderSDK(provider);
  return sdk.languageModel(modelId);
}

export function getModelsFromProvider(
  provider: ModelsDevProvider | CustomModelsDevProvider,
): ModelsDevModel[] {
  return Object.values(provider.models);
}

export function isCustomProvider(
  provider: ModelsDevProvider | CustomModelsDevProvider,
): provider is CustomModelsDevProvider {
  return (provider as CustomModelsDevProvider).isCustom === true;
}

export function isExtendedProvider(
  provider: ModelsDevProvider | CustomModelsDevProvider,
): provider is CustomModelsDevProvider {
  return (provider as CustomModelsDevProvider).isExtended === true;
}

export function mergeCustomProviders(
  modelsDevData: ModelsDevResponse,
  customProviders: Record<string, unknown>,
): ModelsDevResponse {
  const merged: ModelsDevResponse = { ...modelsDevData };

  for (const providerId of Object.keys(customProviders)) {
    const customConfig = customProviders[providerId];
    if (!customConfig) continue;

    const customConfigObj = customConfig as unknown as Record<string, unknown>;
    if (!customConfigObj) continue;

    const shouldExtend = customConfigObj['extend'] === true;
    const existingProvider = modelsDevData[providerId] as ModelsDevProvider | undefined;
    const customModelConfig = customConfigObj['models'];

if (shouldExtend && existingProvider && customModelConfig) {
      for (const [modelId, modelUnknown] of Object.entries(customModelConfig as Record<string, unknown>)) {
        const customModel = modelUnknown as unknown as Record<string, unknown>;
        if (existingProvider.models[modelId]) {
          const existingModel = existingProvider.models[modelId];
          if (!existingModel.reasoning && customModel['reasoning']) {
            console.warn(
              `Warning: Override reasoning for already defined model "${providerId}/${modelId}"`
            );
          }
        }

        existingProvider.models[modelId] = {
          id: modelId,
          name: String(customModel['name']),
          attachment: !!customModel['attachment'],
          reasoning: !!customModel['reasoning'],
          tool_call: !!customModel['tool_call'],
          temperature: !!customModel['temperature'],
          cost: existingProvider.models[modelId]?.cost,
          limit: existingProvider.models[modelId]?.limit,
        };
      }

      merged[providerId as string] = existingProvider as ModelsDevResponse[string];
    } else if (customModelConfig) {
      const modelsMap: Record<string, ModelsDevModel> = {};

      for (const [modelId, modelUnknown] of Object.entries(customModelConfig as Record<string, unknown>)) {
        const customModel = modelUnknown as unknown as Record<string, unknown>;
        modelsMap[modelId] = {
          id: modelId,
          name: String(customModel['name']),
          attachment: !!customModel['attachment'],
          reasoning: !!customModel['reasoning'],
          tool_call: !!customModel['tool_call'],
          temperature: !!customModel['temperature'],
        };
      }

      const customEnvArr = customConfigObj['env'];
      const envList = Array.isArray(customEnvArr) ? customEnvArr : [];

      const customNpmStr = customConfigObj['npm'];
      const customNpm = typeof customNpmStr === 'string' ? customNpmStr : undefined;

      const customApiStr = customConfigObj['api'];
      const customApi = typeof customApiStr === 'string' ? customApiStr : undefined;

      const mergedProvider: CustomModelsDevProvider = {
        id: providerId,
        name: providerId,
        env: envList as string[],
        npm: customNpm || '@ai-sdk/openai-compatible',
        api: customApi,
        models: modelsMap,
        isCustom: true as const,
      };

      if (customApi && !customNpm) {
        mergedProvider.npm = '@ai-sdk/openai-compatible';
      }

      merged[providerId as string] = mergedProvider as ModelsDevResponse[string];
    }
  }

  return merged;
}
