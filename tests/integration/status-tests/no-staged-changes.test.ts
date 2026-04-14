import { assertEquals, assertStringIncludes } from '@std/assert';
import { createStatusHarness } from './test-harness.ts';

Deno.test('status: shows "Stage some changes" tip when no staged changes', async () => {
  const harness = createStatusHarness();
  const result = harness.run();

  assertEquals(result.ok, true);
  assertEquals(harness.exitCode, null);
  assertStringIncludes(
    harness.logs.join('\n'),
    'Stage some changes',
  );

  await harness.cleanup();
});
