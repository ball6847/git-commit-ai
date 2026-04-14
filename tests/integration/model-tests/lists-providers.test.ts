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
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    env: [],
    npm: '@ai-sdk/openai-compatible',
    api: 'http://localhost:11434/api',
    models: {
      'llama3': {
        id: 'llama3',
        name: 'Llama 3',
        attachment: false,
        reasoning: false,
        tool_call: false,
        temperature: true,
      },
    },
  },
};

Deno.test('lists-providers: prints all providers and their models', async () => {
  const harness = createModelHarness(MOCK_DATA);
  await harness.run();

  const output = harness.logs.join('\n');

  assertStringIncludes(output, 'OpenAI');
  assertStringIncludes(output, 'openai/gpt-4o');

  assertStringIncludes(output, 'Anthropic');
  assertStringIncludes(output, 'anthropic/claude-3-5-sonnet');

  assertStringIncludes(output, 'Ollama');
  assertStringIncludes(output, 'ollama/llama3');
});
