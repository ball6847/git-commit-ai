import { assertEquals } from '@std/assert';
import { createHarness } from './test-harness.ts';

Deno.test('no changes: exits cleanly when there are no changes to commit', async () => {
  const harness = createHarness();
  harness.ai.setResponse('feat: test');

  const result = await harness.run({ model: 'test-model' });
  assertEquals(result.ok, true);

  const logs = harness.logs.join('\n');
  assertEquals(logs.includes('No changes to commit'), true);
  assertEquals(harness.commitMessages.length, 0);
  await harness.cleanup();
});
