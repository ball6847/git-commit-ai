import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { capture } from 'ts-mockito';
import { createHarness } from '../helpers/test-harness.ts';

Deno.test('combinations: debug + dry-run + no-push + commit work together', async () => {
  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    model: 'test-model',
    debug: true,
    dryRun: true,
    noPush: true,
    commit: true,
  });
  assertEquals(result.ok, true);

  const logs = harness.logs.join('\n');
  assertEquals(logs.includes('--dry-run is active: ignoring --commit'), true);
  assertEquals(harness.repo.isCommitted('feat: test'), false);
  const [config] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(config.model, 'test-model');
  await harness.cleanup();
});
