import { assertEquals } from '@std/assert';
import { createHarness } from './test-harness.ts';

Deno.test('no staged flag: runs git add . by default', async () => {
  const harness = createHarness();
  harness.repo.stageFile('file.ts', 'export const y = 2;');
  harness.ai.setResponse('feat: add file');

  const result = await harness.run({ model: 'test-model' });
  assertEquals(result.ok, true);

  assertEquals(harness.stageAllCalled, true);
  assertEquals(harness.repo.isCommitted('feat: add file'), true);
  await harness.cleanup();
});
