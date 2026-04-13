import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { capture } from 'ts-mockito';
import { createHarness } from '../helpers/test-harness.ts';

Deno.test('ai params: passes temperature and maxTokens to AI config', async () => {
  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    model: 'test-model',
    temperature: 0.7,
    maxTokens: 500,
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  const [config] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(config.temperature, 0.7);
  assertEquals(config.maxTokens, 500);
  await harness.cleanup();
});
