import { assertEquals, assertStringIncludes } from '@std/assert';
import { createNoRepoHarness } from './test-harness.ts';

Deno.test('not git repo: exits with error when not in a git repository', async () => {
  const harness = createNoRepoHarness();
  const result = await harness.run({ model: 'test-model' });

  assertEquals(result.ok, true);
  assertEquals(harness.exitCode, 1);
  assertStringIncludes(
    harness.logs.join('\n'),
    'Not in a git repository',
  );
});
