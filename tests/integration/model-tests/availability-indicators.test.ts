import { assertStringIncludes } from '@std/assert';
import { createModelHarness } from './test-harness.ts';
import type { ModelsDevResponse } from '../../../src/models-dev.ts';

const MOCK_DATA: ModelsDevResponse = {
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
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    env: ['ANTHROPIC_API_KEY'],
    npm: '@ai-sdk/anthropic',
    models: {
      'claude-3-5-sonnet': {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        attachment: true,
        reasoning: true,
        tool_call: true,
        temperature: true,
      },
    },
  },
};

Deno.test('availability-indicators: shows check for providers with API keys', async () => {
  const harness = createModelHarness(MOCK_DATA);
  await harness.run({
    modelService: {
      getProviderApiKey: (provider) => {
        if (provider.id === 'openai') {
          return 'sk-test-key';
        }
        return null;
      },
    },
  });

  const output = harness.logs.join('\n');

  assertStringIncludes(output, '✓');
  assertStringIncludes(output, 'OpenAI');

  assertStringIncludes(output, '✗');
  assertStringIncludes(output, 'Anthropic');
});

Deno.test('availability-indicators: shows cross for providers without API keys', async () => {
  const harness = createModelHarness(MOCK_DATA);
  await harness.run({
    modelService: {
      getProviderApiKey: () => null,
    },
  });

  const output = harness.logs.join('\n');

  assertStringIncludes(output, '✗');
});
