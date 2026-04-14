import { assertEquals, assertStringIncludes } from '@std/assert';
import { createStatusHarness } from './test-harness.ts';

Deno.test('status: shows deleted files with D status in summary', async () => {
  const harness = createStatusHarness();
  harness.repo.stageFile('doomed.ts', '// will be deleted');

  const command = new Deno.Command('git', {
    args: ['commit', '-m', 'initial'],
    cwd: harness.repo.dir,
    stdout: 'piped',
    stderr: 'piped',
  });
  command.outputSync();

  const filePath = `${harness.repo.dir}/doomed.ts`;
  Deno.removeSync(filePath);

  const stageCommand = new Deno.Command('git', {
    args: ['add', 'doomed.ts'],
    cwd: harness.repo.dir,
    stdout: 'piped',
    stderr: 'piped',
  });
  stageCommand.outputSync();

  const result = harness.run();

  assertEquals(result.ok, true);
  assertEquals(harness.exitCode, null);

  const output = harness.logs.join('\n');
  assertStringIncludes(output, 'doomed.ts');
  assertStringIncludes(output, 'deleted');

  await harness.cleanup();
});
