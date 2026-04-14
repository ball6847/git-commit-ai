import { assertEquals, assertStringIncludes } from '@std/assert';
import { join } from '@std/path';
import { handleVersion, VERSION } from '../../../src/cmd/version.ts';

const DENO_JSON_PATH = join(import.meta.dirname!, '..', '..', '..', 'deno.json');
const DENO_JSON_VERSION: string = JSON.parse(
  await Deno.readTextFile(DENO_JSON_PATH),
).version;

Deno.test('version command output', async (t) => {
  await t.step('outputs version string with expected format', () => {
    const logs: string[] = [];
    handleVersion({
      logger: {
        log: (...args: unknown[]) => {
          logs.push(args.map(String).join(' '));
        },
        error: () => {},
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
        error: () => {},
      },
    });
    assertStringIncludes(logs[0], 'git-commit-ai v');
  });

  await t.step('VERSION constant is a valid semver-like string', () => {
    const semverPattern = /^\d+\.\d+\.\d+$/;
    assertEquals(semverPattern.test(VERSION), true);
  });

  await t.step('VERSION matches deno.json version', () => {
    assertEquals(VERSION, DENO_JSON_VERSION);
  });
});
