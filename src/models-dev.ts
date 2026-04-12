import { createAnthropic } from '@ai-sdk/anthropic';
import { createCerebras } from '@ai-sdk/cerebras';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

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

export type ModelsDevResponse = Record<string, ModelsDevProvider>;

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
const CACHE_DIR = `${Deno.env.get('HOME') || '.'}/.git-commit-ai`;
const CACHE_FILE = `${CACHE_DIR}/models-cache.json`;
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
  try {
    const raw = await Deno.readTextFile(CACHE_FILE);
    const cached: CachedModelsDev = JSON.parse(raw);
    return cached;
  } catch {
    return null;
  }
}

async function saveCache(data: ModelsDevResponse): Promise<void> {
  const cached: CachedModelsDev = {
    data,
    timestamp: Date.now(),
  };

  try {
    await Deno.mkdir(CACHE_DIR, { recursive: true });
    await Deno.writeTextFile(CACHE_FILE, JSON.stringify(cached));
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
  try {
    await Deno.remove(CACHE_FILE);
  } catch {
    // Cache file doesn't exist, nothing to clear
  }
}

export function getProviderApiKey(provider: ModelsDevProvider): string | null {
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
    if (!apiKey) continue;
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
  '@ai-sdk/openai': (opts) => createOpenAI(opts),
  '@ai-sdk/cerebras': (opts) => createCerebras(opts),
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
