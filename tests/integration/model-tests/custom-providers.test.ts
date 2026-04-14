import { assertStringIncludes } from '@std/assert';
import { createModelHarness } from './test-harness.ts';
import type { ModelsDevResponse } from '../../../src/models-dev.ts';
import type { Result } from '../../../src/result.ts';
import type { ConfigFile } from '../../../src/types.ts';
import { mergeCustomProviders } from '../../../src/models-dev.ts';

const BASE_DATA: ModelsDevResponse = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    env: ['OPENAI_API_KEY'],
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
};

Deno.test('custom-providers: merges and displays custom providers from config', async () => {
  const harness = createModelHarness(BASE_DATA);

  const customProviders: Record<string, unknown> = {
    mycustom: {
      env: ['MYCUSTOM_API_KEY'],
      npm: '@ai-sdk/openai-compatible',
      api: 'https://api.mycustom.example.com',
      models: {
        'custom-model-1': {
          name: 'Custom Model 1',
          reasoning: true,
          tool_call: false,
          attachment: false,
          temperature: true,
        },
      },
    },
  };

  await harness.run({
    loadConfig: () =>
      Promise.resolve({
        ok: true,
        value: { providers: customProviders } as ConfigFile,
      } as Result<ConfigFile, Error>),
    mergeCustomProviders: (data, custom) => mergeCustomProviders(data, custom),
  });

  const output = harness.logs.join('\n');

  assertStringIncludes(output, 'mycustom');
  assertStringIncludes(output, 'custom-model-1');
});

Deno.test('custom-providers: shows custom provider models alongside built-in providers', async () => {
  const harness = createModelHarness(BASE_DATA);

  const customProviders: Record<string, unknown> = {
    mycustom: {
      env: ['MYCUSTOM_API_KEY'],
      npm: '@ai-sdk/openai-compatible',
      api: 'https://api.mycustom.example.com',
      models: {
        'custom-model-1': {
          name: 'Custom Model 1',
          reasoning: false,
          tool_call: false,
          attachment: false,
          temperature: true,
        },
      },
    },
  };

  await harness.run({
    loadConfig: () =>
      Promise.resolve({
        ok: true,
        value: { providers: customProviders } as ConfigFile,
      } as Result<ConfigFile, Error>),
    mergeCustomProviders: (data, custom) => mergeCustomProviders(data, custom),
  });

  const output = harness.logs.join('\n');

  assertStringIncludes(output, 'OpenAI');
  assertStringIncludes(output, 'openai/gpt-4o');
  assertStringIncludes(output, 'mycustom/custom-model-1');
});
