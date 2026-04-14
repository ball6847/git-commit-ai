import { assertEquals } from '@std/assert';
import { unwrap } from '../../../src/result.ts';
import { createHarness } from '../helpers/test-harness.ts';
import { getRemoteLog } from '../helpers/temp-repo.ts';

Deno.test('push flag: commits and pushes to bare remote', async () => {
  const harness = createHarness();
  const remoteDir = await Deno.makeTempDir();

  try {
    const initRemote = new Deno.Command('git', {
      args: ['init', '--bare', remoteDir],
      stdout: 'null',
      stderr: 'null',
    });
    await initRemote.output();

    harness.repo.stageFile('test.ts', '// test');
    harness.ai.setResponse('feat: test');
    harness.repo.addRemote(remoteDir);

    const result = await harness.run({
      model: 'test-model',
      commit: true,
      push: true,
    });
    assertEquals(result.ok, true);

    assertEquals(harness.repo.isCommitted('feat: test'), true);
    const remoteLogResult = getRemoteLog(remoteDir);
    assertEquals(remoteLogResult.ok, true);
    assertEquals(unwrap(remoteLogResult).includes('feat: test'), true);
  } finally {
    await harness.cleanup();
    await Deno.remove(remoteDir, { recursive: true }).catch(() => {});
  }
});
