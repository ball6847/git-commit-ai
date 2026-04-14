import { assertEquals } from '@std/assert';
import { mergeConfig } from '../../../src/config.ts';
import type { ConfigFile, CustomProviderConfig } from '../../../src/types.ts';

const DEFAULT_PROVIDERS: Record<string, CustomProviderConfig> = {
  openai: {
    npm: '@ai-sdk/openai',
    env: ['OPENAI_API_KEY'],
    models: {
      'gpt-4o': {
        name: 'GPT-4o',
        reasoning: false,
        tool_call: true,
        attachment: true,
        temperature: true,
      },
    },
  },
};

const DEFAULT_CONFIG = {
  model: 'default-model',
  maxTokens: 200,
  temperature: 0.3,
  providers: DEFAULT_PROVIDERS,
};

Deno.test('mergeConfig: CLI options override config file values', () => {
  const result = mergeConfig(
    { model: 'cli-model' },
    {},
    { model: 'config-model' } as ConfigFile,
    DEFAULT_CONFIG,
  );
  assertEquals(result.model, 'cli-model');
});

Deno.test('mergeConfig: env vars override config file values but not CLI options', () => {
  const result = mergeConfig(
    { model: 'cli-model' },
    { model: 'env-model' },
    { model: 'config-model' } as ConfigFile,
    DEFAULT_CONFIG,
  );
  assertEquals(result.model, 'cli-model');
});

Deno.test('mergeConfig: env vars override config file when no CLI option', () => {
  const result = mergeConfig(
    {},
    { model: 'env-model' },
    { model: 'config-model' } as ConfigFile,
    DEFAULT_CONFIG,
  );
  assertEquals(result.model, 'env-model');
});

Deno.test('mergeConfig: config file values override defaults', () => {
  const result = mergeConfig(
    {},
    {},
    { model: 'config-model', temperature: 0.7 } as ConfigFile,
    DEFAULT_CONFIG,
  );
  assertEquals(result.model, 'config-model');
  assertEquals(result.temperature, 0.7);
  assertEquals(result.maxTokens, 200);
});

Deno.test('mergeConfig: custom providers from config file are merged into resolved config', () => {
  const customProviders: Record<string, CustomProviderConfig> = {
    custom: {
      npm: '@ai-sdk/custom',
      env: ['CUSTOM_API_KEY'],
      models: {
        'custom-model': {
          name: 'Custom Model',
          reasoning: false,
          tool_call: false,
          attachment: false,
          temperature: true,
        },
      },
    },
  };

  const result = mergeConfig(
    {},
    {},
    { providers: customProviders } as ConfigFile,
    DEFAULT_CONFIG,
  );
  assertEquals(result.providers, customProviders);
});

Deno.test('mergeConfig: custom providers from defaults are used when config file has no providers', () => {
  const result = mergeConfig(
    {},
    {},
    { model: 'config-model' } as ConfigFile,
    DEFAULT_CONFIG,
  );
  assertEquals(result.providers, DEFAULT_PROVIDERS);
});

Deno.test('mergeConfig: defaults are used when no overrides provided', () => {
  const result = mergeConfig({}, {}, {}, DEFAULT_CONFIG);
  assertEquals(result.model, 'default-model');
  assertEquals(result.maxTokens, 200);
  assertEquals(result.temperature, 0.3);
  assertEquals(result.providers, DEFAULT_PROVIDERS);
});
