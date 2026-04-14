import { assertEquals } from '@std/assert';
import { capture } from 'ts-mockito';
import { createHarness } from '../helpers/test-harness.ts';
import { Result } from 'typescript-result';

const removeSync = Result.wrap(Deno.removeSync);

function setupConfigFile(model: string): { configHome: string; cleanup: () => void } {
  const configHome = Deno.makeTempDirSync();
  const configDir = `${configHome}/git-commit-ai`;
  Deno.mkdirSync(configDir, { recursive: true });
  Deno.writeTextFileSync(
    `${configDir}/config.json`,
    JSON.stringify({ model }),
  );
  return {
    configHome,
    cleanup: () => {
      const removeResult = removeSync(configHome, { recursive: true });
      if (!removeResult.ok) {
        // ignore cleanup failures
      }
    },
  };
}

Deno.test('env model: GIT_COMMIT_AI_MODEL is used when --model is not provided', async () => {
  const originalEnv = Deno.env.get('GIT_COMMIT_AI_MODEL');
  Deno.env.set('GIT_COMMIT_AI_MODEL', 'env-test-model');

  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  const [config] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(config.model, 'env-test-model');

  await harness.cleanup();

  if (originalEnv === undefined) {
    Deno.env.delete('GIT_COMMIT_AI_MODEL');
  } else {
    Deno.env.set('GIT_COMMIT_AI_MODEL', originalEnv);
  }
});

Deno.test('env model: --model overrides GIT_COMMIT_AI_MODEL', async () => {
  const originalEnv = Deno.env.get('GIT_COMMIT_AI_MODEL');
  Deno.env.set('GIT_COMMIT_AI_MODEL', 'env-test-model');

  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    model: 'cli-test-model',
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  const [config] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(config.model, 'cli-test-model');

  await harness.cleanup();

  if (originalEnv === undefined) {
    Deno.env.delete('GIT_COMMIT_AI_MODEL');
  } else {
    Deno.env.set('GIT_COMMIT_AI_MODEL', originalEnv);
  }
});

Deno.test('config file: model from config file is used when no --model or env var', async () => {
  const originalXdg = Deno.env.get('XDG_CONFIG_HOME');
  const originalEnv = Deno.env.get('GIT_COMMIT_AI_MODEL');

  // Clear env var to ensure config file is used
  Deno.env.delete('GIT_COMMIT_AI_MODEL');

  // Setup config file
  const { configHome, cleanup } = setupConfigFile('config-file-model');
  Deno.env.set('XDG_CONFIG_HOME', configHome);

  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  const [config] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(config.model, 'config-file-model');

  await harness.cleanup();
  cleanup();

  // Restore env vars
  if (originalXdg === undefined) {
    Deno.env.delete('XDG_CONFIG_HOME');
  } else {
    Deno.env.set('XDG_CONFIG_HOME', originalXdg);
  }
  if (originalEnv === undefined) {
    Deno.env.delete('GIT_COMMIT_AI_MODEL');
  } else {
    Deno.env.set('GIT_COMMIT_AI_MODEL', originalEnv);
  }
});

Deno.test('config file: --model overrides config file model', async () => {
  const originalXdg = Deno.env.get('XDG_CONFIG_HOME');
  const originalEnv = Deno.env.get('GIT_COMMIT_AI_MODEL');

  Deno.env.delete('GIT_COMMIT_AI_MODEL');

  // Setup config file
  const { configHome, cleanup } = setupConfigFile('config-file-model');
  Deno.env.set('XDG_CONFIG_HOME', configHome);

  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    model: 'cli-test-model',
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  const [config] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(config.model, 'cli-test-model');

  await harness.cleanup();
  cleanup();

  // Restore env vars
  if (originalXdg === undefined) {
    Deno.env.delete('XDG_CONFIG_HOME');
  } else {
    Deno.env.set('XDG_CONFIG_HOME', originalXdg);
  }
  if (originalEnv === undefined) {
    Deno.env.delete('GIT_COMMIT_AI_MODEL');
  } else {
    Deno.env.set('GIT_COMMIT_AI_MODEL', originalEnv);
  }
});

Deno.test('config file: env var overrides config file model', async () => {
  const originalXdg = Deno.env.get('XDG_CONFIG_HOME');
  const originalEnv = Deno.env.get('GIT_COMMIT_AI_MODEL');

  Deno.env.set('GIT_COMMIT_AI_MODEL', 'env-test-model');

  // Setup config file
  const { configHome, cleanup } = setupConfigFile('config-file-model');
  Deno.env.set('XDG_CONFIG_HOME', configHome);

  const harness = createHarness();
  harness.repo.stageFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({
    dryRun: true,
    noPush: true,
  });
  assertEquals(result.ok, true);

  const [config] = capture(harness.ai.mock.generateCommitMessage).last();
  assertEquals(config.model, 'env-test-model');

  await harness.cleanup();
  cleanup();

  // Restore env vars
  if (originalXdg === undefined) {
    Deno.env.delete('XDG_CONFIG_HOME');
  } else {
    Deno.env.set('XDG_CONFIG_HOME', originalXdg);
  }
  if (originalEnv === undefined) {
    Deno.env.delete('GIT_COMMIT_AI_MODEL');
  } else {
    Deno.env.set('GIT_COMMIT_AI_MODEL', originalEnv);
  }
});
