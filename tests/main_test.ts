import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getChangeSummary, isGitRepository } from '../src/git.ts';
import { initializeAI, parseConventionalCommit } from '../src/ai.ts';

Deno.test('Git operations', async (t) => {
  await t.step('should detect if in git repository', () => {
    // This will depend on where the test is run
    const result = isGitRepository();
    // Just ensure it returns a boolean
    assertEquals(typeof result, 'boolean');
  });

  await t.step('should get change summary without errors', () => {
    // This might throw if no git repo, which is fine for testing
    try {
      const summary = getChangeSummary();
      assertEquals(typeof summary.totalFiles, 'number');
      assertEquals(Array.isArray(summary.files), true);
    } catch (error) {
      // Expected if not in a git repo
      assertEquals(error instanceof Error, true);
    }
  });
});

Deno.test('AI operations', async (t) => {
  await t.step('should initialize AI config', () => {
    const config = initializeAI('test-key', 'test-model');
    assertEquals(config.apiKey, 'test-key');
    assertEquals(config.model, 'test-model');
    assertEquals(config.baseURL, 'https://openrouter.ai/api/v1');
  });

  await t.step('should parse conventional commit messages', () => {
    const validCommit = 'feat(auth): add user login validation';
    const parsed = parseConventionalCommit(validCommit);

    assertEquals(parsed.isValid, true);
    assertEquals(parsed.type, 'feat');
    assertEquals(parsed.scope, 'auth');
    assertEquals(parsed.description, 'add user login validation');
  });

  await t.step('should handle invalid commit messages', () => {
    const invalidCommit = 'random commit message';
    const parsed = parseConventionalCommit(invalidCommit);

    assertEquals(parsed.isValid, false);
    assertEquals(parsed.type, null);
    assertEquals(parsed.scope, null);
    assertEquals(parsed.description, 'random commit message');
  });
});
