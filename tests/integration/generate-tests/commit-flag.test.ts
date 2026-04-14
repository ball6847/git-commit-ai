import { assertEquals } from '@std/assert';
import { createHarness } from '../helpers/test-harness.ts';

Deno.test('commit flag: commits without prompt', async () => {
  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    model: 'test-model',
    commit: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  assertEquals(harness.repo.isCommitted('feat: test'), true);
  await harness.cleanup();
});
