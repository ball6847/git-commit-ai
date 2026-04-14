---
story_id: STORY-019
title: Integration Tests for commit Command
created_at: 2026-04-14
status: Completed
sprint: Sprint 2
epic: Epic 4 - Testing Infrastructure
---

# Story 2.10: Integration Tests for commit Command

**Story ID:** STORY-019
**Priority:** High
**Status:** Not Started
**Sprint:** Sprint 2
**Epic:** Epic 4 - Testing Infrastructure

## User Story

As a developer, I want integration tests for the `commit` command so that staging behavior, flag handling, and AI integration are verified behaviorally and regressions are caught early.

## Acceptance Criteria

### Infrastructure

- [ ] `commit` command is refactored for testability (dependency injection for git ops, AI service, logger, and exit)
- [ ] `tests/integration/commit-tests/` directory created

### Test Cases

- [ ] `basic-commit.test.ts` — Stages changes, generates message, and commits without prompting
- [ ] `staged-flag.test.ts` — With `--staged`, only commits already-staged files (does not run `git add .`)
- [ ] `no-staged-flag.test.ts` — Without `--staged`, runs `git add .` before committing
- [ ] `model-flag.test.ts` — Asserts model ID is passed to AI config
- [ ] `debug-flag.test.ts` — Asserts debug output contains diff preview and model info
- [ ] `no-changes.test.ts` — Exits cleanly when there are no changes to commit
- [ ] `not-git-repo.test.ts` — Exits with error when not in a git repository

### Test Execution

- [ ] `deno task test:integration` runs all commit tests
- [ ] All tests pass (< 2 seconds each)
- [ ] Tests are parallel-safe (isolated temp repos)
- [ ] Tests clean up temp directories

## Technical Notes

### Test Pattern

```typescript
Deno.test('commit: stages and commits all changes', async () => {
  const harness = createCommitHarness();
  harness.repo.createFile('test.ts', '// test');
  harness.ai.setResponse('feat: test');

  const result = await harness.run({ model: 'test-model' });
  assertEquals(result.ok, true);
  assertEquals(harness.repo.isCommitted('feat: test'), true);
  await harness.cleanup();
});
```

### Dependencies

- `ts-mockito` npm package
- `Deno.makeTempDir` API
- Similar DI pattern as `generate` command (STORY-015 / STORY-016)

## Files to Create

1. `tests/integration/commit-tests/basic-commit.test.ts`
2. `tests/integration/commit-tests/staged-flag.test.ts`
3. `tests/integration/commit-tests/no-staged-flag.test.ts`
4. `tests/integration/commit-tests/model-flag.test.ts`
5. `tests/integration/commit-tests/debug-flag.test.ts`
6. `tests/integration/commit-tests/no-changes.test.ts`
7. `tests/integration/commit-tests/not-git-repo.test.ts`

## Files to Modify

- `src/cmd/commit.ts` — Add dependency injection for `isGitRepository`, `getChangeSummary`, `getStagedDiff`, `generateCommitMessage`, `cwd`, `logger`, and `exit`

## Story Points

3

## Dependencies

- **STORY-016** (Integration Testing Framework) — pattern reference
- **STORY-015** (Dependency Injection Refactor) — pattern reference
