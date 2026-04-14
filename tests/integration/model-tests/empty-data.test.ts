import { assertStringIncludes } from '@std/assert';
import { createModelHarness } from './test-harness.ts';

Deno.test('empty-data: prints friendly error when models.dev data is empty', async () => {
  const harness = createModelHarness({});
  await harness.run();

  const output = harness.logs.join('\n');

  assertStringIncludes(output, 'Could not fetch models.dev data');
});
