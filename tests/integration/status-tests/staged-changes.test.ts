import { assertEquals, assertNotMatch, assertStringIncludes } from '@std/assert';
import { createStatusHarness } from './test-harness.ts';

Deno.test('status: displays file list and "Ready to generate" for staged changes', async () => {
  const harness = createStatusHarness();
  harness.repo.stageFile('hello.ts', "console.log('hello');");
  harness.repo.stageFile('world.ts', "console.log('world');");

  const result = harness.run();

  assertEquals(result.ok, true);
  assertEquals(harness.exitCode, null);

  const output = harness.logs.join('\n');
  assertStringIncludes(output, 'hello.ts');
  assertStringIncludes(output, 'world.ts');
  assertStringIncludes(output, 'Ready to generate');
  assertNotMatch(output, /Stage some changes/);

  await harness.cleanup();
});
