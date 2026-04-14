import { assertEquals, assertStringIncludes } from '@std/assert';
import { createNoRepoHarness } from './test-harness.ts';

Deno.test('status: exits with error when not in a git repository', () => {
  const harness = createNoRepoHarness();
  const result = harness.run();

  assertEquals(result.ok, true);
  assertEquals(harness.exitCode, 1);
  assertStringIncludes(
    harness.logs.join('\n'),
    'Not in a git repository',
  );
});
