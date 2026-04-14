import { assertEquals } from '@std/assert';
import { createHarness } from './test-harness.ts';

Deno.test('basic commit: stages changes, generates message, and commits', async () => {
  const harness = createHarness();
  harness.repo.stageFile('hello.ts', 'console.log("hello");');
  harness.ai.setResponse('feat: add hello module');

  const result = await harness.run({ model: 'test-model' });
  assertEquals(result.ok, true);

  assertEquals(harness.repo.isCommitted('feat: add hello module'), true);
  assertEquals(harness.commitMessages.length, 1);
  await harness.cleanup();
});
