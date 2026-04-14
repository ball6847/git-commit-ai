import { assertEquals } from '@std/assert';
import { createHarness } from './test-harness.ts';

Deno.test('debug flag: outputs diff preview and model info', async () => {
  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({ model: 'test-model', debug: true });
  assertEquals(result.ok, true);

  const logs = harness.logs.join('\n');
  assertEquals(logs.includes('Git diff preview:'), true);
  assertEquals(logs.includes('Using model: test-model'), true);
  await harness.cleanup();
});
