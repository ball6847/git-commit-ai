import { createOpenAI } from '@ai-sdk/openai';
import type { ModelRecord } from '../types.ts';

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

const providerId = 'openrouter';
const CACHE_DIR = `${Deno.env.get('HOME') || '.'}/.git-commit-ai`;
const CACHE_FILE = `${CACHE_DIR}/openrouter_models_cache.json`;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedModels {
  models: OpenRouterModel[];
  timestamp: number;
}

async function loadCachedModels(): Promise<OpenRouterModel[] | null> {
  try {
    const cacheData = await Deno.readTextFile(CACHE_FILE);
    const cached: CachedModels = JSON.parse(cacheData);
    
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.models;
    }
  } catch {
    // Cache doesn't exist or is invalid
  }
  return null;
}

async function saveCachedModels(models: OpenRouterModel[]): Promise<void> {
  const cached: CachedModels = {
    models,
    timestamp: Date.now(),
  };
  
  try {
    await Deno.mkdir(CACHE_DIR, { recursive: true });
    await Deno.writeTextFile(CACHE_FILE, JSON.stringify(cached));
  } catch (error) {
    console.warn('Failed to cache OpenRouter models:', error);
  }
}

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const cached = await loadCachedModels();
  if (cached) {
    return cached;
  }

  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY not found, using fallback models');
    return [];
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OpenRouterResponse = await response.json();
    await saveCachedModels(data.data);
    return data.data;
  } catch (error) {
    console.warn('Failed to fetch OpenRouter models:', error);
    return [];
  }
}

export async function getOpenRouterModels(): Promise<ModelRecord> {
  const models = await fetchOpenRouterModels();
  const openrouter = createOpenAI({
    apiKey: Deno.env.get('OPENROUTER_API_KEY') || '',
    baseURL: 'https://openrouter.ai/api/v1',
  });

  const modelRecord: ModelRecord = {};
  
  for (const model of models) {
    const isFree = model.pricing.prompt === '0' && model.pricing.completion === '0' && model.pricing.request === '0';
    
    if (isFree) {
      modelRecord[`${providerId}/${model.id}`] = openrouter(model.id);
    }
  }

  return modelRecord;
}