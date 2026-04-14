import { assertEquals } from '@std/assert';
import { createHarness } from '../helpers/test-harness.ts';

Deno.test('no staged changes: auto-stages all and generates commit', async () => {
  const harness = createHarness();
  harness.repo.writeFile('unstaged.ts', 'export const x = 1;');
  harness.ai.setResponse('feat: add unstaged');

  const result = await harness.run({
    model: 'test-model',
    commit: true,
    noPush: true,
  });
  assertEquals(result.ok, true);
  assertEquals(harness.stageAllCalled, true);
  assertEquals(harness.repo.isCommitted('feat: add unstaged'), true);
  await harness.cleanup();
});

Deno.test('has staged changes: respects explicit staging and does not auto-stage', async () => {
  const harness = createHarness();
  harness.repo.stageFile('staged.ts', 'export const a = 1;');
  harness.repo.writeFile('unstaged.ts', 'export const b = 2;');
  harness.ai.setResponse('feat: add staged');

  const result = await harness.run({
    model: 'test-model',
    commit: true,
    noPush: true,
  });
  assertEquals(result.ok, true);
  assertEquals(harness.stageAllCalled, false);
  assertEquals(harness.repo.isCommitted('feat: add staged'), true);
  await harness.cleanup();
});

Deno.test('no changes at all: exits gracefully with no changes message', async () => {
  const harness = createHarness();

  const result = await harness.run({
    model: 'test-model',
    commit: true,
    noPush: true,
  });
  assertEquals(result.ok, true);
  assertEquals(harness.exitCode, 0);
  assertEquals(harness.stageAllCalled, true);
  assertEquals(harness.logs.some((log) => log.includes('No changes to commit')), true);
  await harness.cleanup();
});
