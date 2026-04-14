import { assertStringIncludes } from '@std/assert';
import { createModelHarness } from './test-harness.ts';
import type { ModelsDevResponse } from '../../../src/models-dev.ts';

const MOCK_DATA: ModelsDevResponse = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    env: ['DEEPSEEK_API_KEY'],
    npm: '@ai-sdk/openai-compatible',
    api: 'https://api.deepseek.com',
    models: {
      'deepseek-r1': {
        id: 'deepseek-r1',
        name: 'DeepSeek R1',
        attachment: false,
        reasoning: true,
        tool_call: true,
        temperature: true,
      },
      'deepseek-chat': {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        attachment: true,
        reasoning: false,
        tool_call: false,
        temperature: true,
      },
    },
  },
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

Deno.test('feature-tags: displays reasoning tag for reasoning models', async () => {
  const harness = createModelHarness(MOCK_DATA);
  await harness.run();

  const output = harness.logs.join('\n');

  assertStringIncludes(output, '[reasoning');
});

Deno.test('feature-tags: displays tools tag for tool_call models', async () => {
  const harness = createModelHarness(MOCK_DATA);
  await harness.run();

  const output = harness.logs.join('\n');

  assertStringIncludes(output, 'tools');
});

Deno.test('feature-tags: displays attachments tag for attachment models', async () => {
  const harness = createModelHarness(MOCK_DATA);
  await harness.run();

  const output = harness.logs.join('\n');

  assertStringIncludes(output, 'attachments');
});

Deno.test('feature-tags: model with all features shows all tags', async () => {
  const harness = createModelHarness(MOCK_DATA);
  await harness.run();

  const output = harness.logs.join('\n');

  assertStringIncludes(output, 'deepseek-r1');
  assertStringIncludes(output, '[reasoning, tools]');
});

Deno.test('feature-tags: model with no features shows no tags', async () => {
  const NO_FEATURE_DATA: ModelsDevResponse = {
    basic: {
      id: 'basic',
      name: 'Basic',
      env: [],
      npm: '@ai-sdk/openai-compatible',
      models: {
        'basic-model': {
          id: 'basic-model',
          name: 'Basic Model',
          attachment: false,
          reasoning: false,
          tool_call: false,
          temperature: true,
        },
      },
    },
  };

  const harness = createModelHarness(NO_FEATURE_DATA);
  await harness.run();

  const basicLine = harness.logs.find((l) => l.includes('basic/basic-model'));
  assertStringIncludes(basicLine ?? '', 'basic/basic-model');
  if (basicLine) {
    const tagMatch = basicLine.match(/\[.*\]/);
    if (tagMatch) {
      throw new Error(`Expected no feature tags but found: ${tagMatch[0]}`);
    }
  }
});
