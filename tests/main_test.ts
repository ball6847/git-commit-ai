import { assertEquals } from '@std/assert';
import { getChangeSummary, isGitRepository } from '../src/git.ts';
import { initializeAI, parseConventionalCommit } from '../src/ai.ts';
import {
  clearModelsDevCache,
  getAvailableProviders,
  getModelFromProvider,
  getModelsDevData,
  getProviderApiKey,
  getProviderSDK,
  isProviderAvailable,
  type ModelsDevProvider,
  type ModelsDevResponse,
} from '../src/models-dev.ts';

Deno.test('Git operations', async (t) => {
  await t.step('should detect if in git repository', () => {
    const result = isGitRepository();
    assertEquals(result.ok, true);
    assertEquals(typeof result.value, 'boolean');
  });

  await t.step('should get change summary without errors', () => {
    const result = getChangeSummary();
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(typeof result.value.totalFiles, 'number');
      assertEquals(Array.isArray(result.value.files), true);
    }
  });
});

Deno.test('AI operations', async (t) => {
  await t.step('should initialize AI config', () => {
    const config = initializeAI('cerebras/zai-glm-4.6');
    assertEquals(config.model, 'cerebras/zai-glm-4.6');
    assertEquals(config.maxTokens, 200);
    assertEquals(config.temperature, 0.3);
  });

  await t.step('should parse conventional commit messages', () => {
    const validCommit = 'feat(auth): add user login validation';
    const parsed = parseConventionalCommit(validCommit);

    assertEquals(parsed.isValid, true);
    assertEquals(parsed.type, 'feat');
    assertEquals(parsed.scope, 'auth');
    assertEquals(parsed.description, 'add user login validation');
  });

  await t.step('should handle invalid commit messages', () => {
    const invalidCommit = 'random commit message';
    const parsed = parseConventionalCommit(invalidCommit);

    assertEquals(parsed.isValid, false);
    assertEquals(parsed.type, null);
    assertEquals(parsed.scope, null);
    assertEquals(parsed.description, 'random commit message');
  });
});

const MOCK_MODELS_DEV_DATA: ModelsDevResponse = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    env: ['TEST_ANTHROPIC_API_KEY'],
    npm: '@ai-sdk/anthropic',
    models: {
      'claude-sonnet-4-5': {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        attachment: true,
        reasoning: true,
        tool_call: true,
        temperature: true,
      },
    },
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    env: ['TEST_OPENAI_API_KEY'],
    npm: '@ai-sdk/openai',
    models: {
      'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        attachment: true,
        reasoning: false,
        tool_call: true,
        temperature: true,
      },
    },
  },
  unknown_provider: {
    id: 'unknown_provider',
    name: 'Unknown Provider',
    env: ['TEST_UNKNOWN_API_KEY'],
    npm: '@unknown/sdk',
    api: 'https://api.unknown.com/v1',
    models: {
      'unknown-model': {
        id: 'unknown-model',
        name: 'Unknown Model',
        attachment: false,
        reasoning: false,
        tool_call: false,
        temperature: true,
      },
    },
  },
};

Deno.test('models.dev provider discovery', async (t) => {
  await t.step('should find provider with matching env var', () => {
    Deno.env.set('TEST_ANTHROPIC_KEY', 'sk-test-xxx');
    const provider: ModelsDevProvider = {
      id: 'test',
      name: 'Test',
      env: ['TEST_ANTHROPIC_KEY', 'OTHER_KEY'],
      npm: '@ai-sdk/anthropic',
      models: {},
    };
    const result = getProviderApiKey(provider);
    assertEquals(result, 'sk-test-xxx');
    Deno.env.delete('TEST_ANTHROPIC_KEY');
  });

  await t.step('should return null when no env var set', () => {
    Deno.env.delete('TEST_UNSET_KEY_1');
    Deno.env.delete('TEST_UNSET_KEY_2');
    const provider: ModelsDevProvider = {
      id: 'test',
      name: 'Test',
      env: ['TEST_UNSET_KEY_1', 'TEST_UNSET_KEY_2'],
      npm: '@ai-sdk/openai',
      models: {},
    };
    const result = getProviderApiKey(provider);
    assertEquals(result, null);
  });

  await t.step('should check second env var if first not set', () => {
    Deno.env.delete('TEST_FIRST_KEY');
    Deno.env.set('TEST_SECOND_KEY', 'sk-second');
    const provider: ModelsDevProvider = {
      id: 'test',
      name: 'Test',
      env: ['TEST_FIRST_KEY', 'TEST_SECOND_KEY'],
      npm: '@ai-sdk/openai',
      models: {},
    };
    const result = getProviderApiKey(provider);
    assertEquals(result, 'sk-second');
    Deno.env.delete('TEST_SECOND_KEY');
  });

  await t.step('should filter available providers correctly', () => {
    Deno.env.set('TEST_ANTHROPIC_API_KEY', 'sk-anthropic-test');
    Deno.env.delete('TEST_OPENAI_API_KEY');
    Deno.env.delete('TEST_UNKNOWN_API_KEY');

    const available = getAvailableProviders(MOCK_MODELS_DEV_DATA);
    assertEquals(available.length, 1);
    assertEquals(available[0].id, 'anthropic');
    assertEquals(available[0].apiKey, 'sk-anthropic-test');
    assertEquals(available[0].models.length, 1);
    assertEquals(available[0].models[0].id, 'claude-sonnet-4-5');

    Deno.env.delete('TEST_ANTHROPIC_API_KEY');
  });

  await t.step('should return multiple providers when multiple env vars set', () => {
    Deno.env.set('TEST_ANTHROPIC_API_KEY', 'sk-anthropic-test');
    Deno.env.set('TEST_OPENAI_API_KEY', 'sk-openai-test');
    Deno.env.delete('TEST_UNKNOWN_API_KEY');

    const available = getAvailableProviders(MOCK_MODELS_DEV_DATA);
    assertEquals(available.length, 2);
    const ids = available.map((p) => p.id).sort();
    assertEquals(ids, ['anthropic', 'openai']);

    Deno.env.delete('TEST_ANTHROPIC_API_KEY');
    Deno.env.delete('TEST_OPENAI_API_KEY');
  });

  await t.step('should return empty array when no env vars set', () => {
    Deno.env.delete('TEST_ANTHROPIC_API_KEY');
    Deno.env.delete('TEST_OPENAI_API_KEY');
    Deno.env.delete('TEST_UNKNOWN_API_KEY');

    const available = getAvailableProviders(MOCK_MODELS_DEV_DATA);
    assertEquals(available.length, 0);
  });

  await t.step('should correctly check provider availability', () => {
    Deno.env.set('TEST_ANTHROPIC_API_KEY', 'sk-test');
    assertEquals(isProviderAvailable(MOCK_MODELS_DEV_DATA, 'anthropic'), true);
    assertEquals(isProviderAvailable(MOCK_MODELS_DEV_DATA, 'openai'), false);
    assertEquals(isProviderAvailable(MOCK_MODELS_DEV_DATA, 'nonexistent'), false);
    Deno.env.delete('TEST_ANTHROPIC_API_KEY');
  });
});

Deno.test('models.dev caching', async (t) => {
  await t.step('should clear cache without error when no cache exists', async () => {
    const result = await clearModelsDevCache();
    assertEquals(result.ok, true);
  });

  await t.step('should return empty object when no cache and fetch fails', async () => {
    await clearModelsDevCache();
    Deno.env.set('GIT_COMMIT_AI_CACHE_TTL', '0');
    const result = await getModelsDevData();
    assertEquals(result.ok, true);
    assertEquals(typeof result.value, 'object');
    Deno.env.delete('GIT_COMMIT_AI_CACHE_TTL');
  });
});

Deno.test('models.dev SDK loading', async (t) => {
  await t.step('should load anthropic provider SDK', () => {
    Deno.env.set('TEST_ANTHROPIC_API_KEY', 'sk-test-key');
    const provider = {
      id: 'anthropic',
      name: 'Anthropic',
      apiKey: 'sk-test-key',
      npm: '@ai-sdk/anthropic',
      models: MOCK_MODELS_DEV_DATA.anthropic.models
        ? Object.values(MOCK_MODELS_DEV_DATA.anthropic.models)
        : [],
    };
    const result = getProviderSDK(provider);
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(typeof result.value.languageModel, 'function');
    }
    Deno.env.delete('TEST_ANTHROPIC_API_KEY');
  });

  await t.step('should load openai provider SDK', () => {
    const provider = {
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test-key',
      npm: '@ai-sdk/openai',
      models: MOCK_MODELS_DEV_DATA.openai.models
        ? Object.values(MOCK_MODELS_DEV_DATA.openai.models)
        : [],
    };
    const result = getProviderSDK(provider);
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(typeof result.value.languageModel, 'function');
    }
  });

  await t.step('should fallback to openai-compatible for unknown npm with api', () => {
    const provider = {
      id: 'unknown_provider',
      name: 'Unknown Provider',
      apiKey: 'sk-test-key',
      npm: '@unknown/sdk',
      api: 'https://api.unknown.com/v1',
      models: MOCK_MODELS_DEV_DATA.unknown_provider.models
        ? Object.values(MOCK_MODELS_DEV_DATA.unknown_provider.models)
        : [],
    };
    const result = getProviderSDK(provider);
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(typeof result.value.languageModel, 'function');
    }
  });

  await t.step('should cache SDK instances', () => {
    const provider = {
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-cache-test-key',
      npm: '@ai-sdk/openai',
      models: [],
    };
    const result1 = getProviderSDK(provider);
    const result2 = getProviderSDK(provider);
    assertEquals(result1.ok, true);
    assertEquals(result2.ok, true);
    if (result1.ok && result2.ok) {
      assertEquals(result1.value, result2.value);
    }
  });

  await t.step('should return language model from provider', () => {
    const provider = {
      id: 'openai',
      name: 'OpenAI',
      apiKey: 'sk-test-key',
      npm: '@ai-sdk/openai',
      models: [],
    };
    const result = getModelFromProvider(provider, 'gpt-4o');
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(typeof result.value, 'object');
    }
  });

  await t.step('should return error for unknown npm without api field', () => {
    const provider = {
      id: 'bad_provider',
      name: 'Bad Provider',
      apiKey: 'sk-test-key',
      npm: '@unknown/no-fallback-sdk',
      models: [],
    };
    const result = getProviderSDK(provider);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.message.includes('not bundled'), true);
    }
  });
});
