# STORY-017: Ensure `--dry-run` Takes Priority Over `--commit` and `--push`

**Story ID:** STORY-017
**Priority:** Medium
**Status:** Not Started
**Epic:** CLI UX Improvement
**Created:** 2026-04-13

---

## User Story

As a user of git-commit-ai, I want `--dry-run` to always take priority over `--commit` and `--push` so that passing `--dry-run --commit --push` safely generates a message without committing or pushing, regardless of flag combination.

---

## Context

Currently, `--dry-run` exits early before the commit/push code runs (`src/cmd/generate.ts:128-133`), so it implicitly takes priority. However:

1. There's no explicit guard or warning when contradictory flags are combined (e.g., `--dry-run --commit --push`)
2. The implicit priority isn't documented or tested
3. Future refactoring could accidentally break this behavior by reordering the logic

This story makes the priority explicit, adds a warning, and adds tests to prevent regressions.

---

## Expected Flag Priority

| Flags | Behavior |
|-------|----------|
| `--dry-run` | Generate only, no commit, no push |
| `--dry-run --commit` | Generate only (dry-run wins), warn about ignored `--commit` |
| `--dry-run --push` | Generate only (dry-run wins), warn about ignored `--push` |
| `--dry-run --commit --push` | Generate only (dry-run wins), warn about ignored flags |
| `--commit --push` | Commit and push without prompts |
| `--commit` | Commit without prompt, then push prompt |
| `--push` | Commit prompt, then push without prompt |

**Priority order:** `--dry-run` > `--push` > `--commit`

---

## Acceptance Criteria

- [ ] `--dry-run` always exits before commit/push, regardless of other flags
- [ ] When `--dry-run` is combined with `--commit` and/or `--push`, a warning is displayed listing the ignored flags
- [ ] Warning format: `⚠️ --dry-run is active: ignoring --commit and --push flags`
- [ ] Add test case for `--dry-run` with `--commit --push`
- [ ] Existing `--dry-run` behavior preserved for solo usage
- [ ] `deno lint` and `deno check src/cli.ts` pass

---

## Technical Design

### Guard in handleGenerate (src/cmd/generate.ts)

```typescript
if (options.dryRun) {
  const ignoredFlags: string[] = [];
  if (options.commit) ignoredFlags.push('--commit');
  if (options.push) ignoredFlags.push('--push');
  if (ignoredFlags.length > 0) {
    console.log(
      yellow(`⚠️  --dry-run is active: ignoring ${ignoredFlags.join(' and ')} flags`),
    );
  }
  console.log(
    blue('🏃 Dry run completed. Use without --dry-run to commit.'),
  );
  Deno.exit(0);
}
```

### Test Cases

```typescript
Deno.test('dry-run takes priority over --commit and --push', async () => {
  // Test that --dry-run --commit --push does not commit or push
  // Verify warning message is displayed
});
```

---

## Files to Create

- None

## Files to Modify

- `src/cmd/generate.ts` — Add explicit guard with warning for ignored flags
- `tests/main_test.ts` — Add test for dry-run priority

---

## Dependencies

- None (independent story)
