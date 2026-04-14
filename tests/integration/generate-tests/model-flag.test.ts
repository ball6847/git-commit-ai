import { assertEquals } from '@std/assert';
import { capture } from 'ts-mockito';
import { createHarness } from '../helpers/test-harness.ts';

Deno.test('model flag: passes model ID to AI config', async () => {
  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    model: 'test-model',
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  const [config] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(config.model, 'test-model');
  await harness.cleanup();
});
