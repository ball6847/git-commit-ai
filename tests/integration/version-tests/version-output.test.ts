import { assertEquals, assertStringIncludes } from '@std/assert';
import { handleVersion, VERSION } from '../../../src/cmd/version.ts';

Deno.test('version command output', async (t) => {
  await t.step('outputs version string with expected format', () => {
    const logs: string[] = [];
    handleVersion({
      logger: {
        log: (...args: unknown[]) => {
          logs.push(args.map(String).join(' '));
        },
      },
    });
    assertEquals(logs.length, 1);
    assertStringIncludes(logs[0], `git-commit-ai v${VERSION}`);
  });

  await t.step('output starts with git-commit-ai v prefix', () => {
    const logs: string[] = [];
    handleVersion({
      logger: {
        log: (...args: unknown[]) => {
          logs.push(args.map(String).join(' '));
        },
      },
    });
    assertStringIncludes(logs[0], 'git-commit-ai v');
  });

  await t.step('VERSION constant is a valid semver-like string', () => {
    const semverPattern = /^\d+\.\d+\.\d+$/;
    assertEquals(semverPattern.test(VERSION), true);
  });
});
