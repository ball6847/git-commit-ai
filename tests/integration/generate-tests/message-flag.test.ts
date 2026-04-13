import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { capture } from 'ts-mockito';
import { createHarness } from '../helpers/test-harness.ts';

Deno.test('message flag: passes user message to AI', async () => {
  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    model: 'test-model',
    message: 'Add authentication',
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  const [, , , userMessage] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(userMessage, 'Add authentication');
  await harness.cleanup();
});
