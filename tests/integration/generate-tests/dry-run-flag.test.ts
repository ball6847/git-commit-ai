import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createHarness } from '../helpers/test-harness.ts';

Deno.test('dry-run flag: AI called but no commit in git log', async () => {
  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    model: 'test-model',
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  assertEquals(harness.repo.isCommitted('feat: test'), false);
  await harness.cleanup();
});
