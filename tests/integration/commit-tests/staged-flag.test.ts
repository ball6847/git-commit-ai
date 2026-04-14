import { assertEquals } from '@std/assert';
import { createHarness } from './test-harness.ts';

Deno.test('staged flag: does not run git add when --staged is set', async () => {
  const harness = createHarness();
  harness.repo.stageFile('file.ts', 'export const x = 1;');
  harness.ai.setResponse('feat: add file');

  const result = await harness.run({ model: 'test-model', staged: true });
  assertEquals(result.ok, true);

  assertEquals(harness.stageAllCalled, false);
  assertEquals(harness.repo.isCommitted('feat: add file'), true);
  await harness.cleanup();
});
