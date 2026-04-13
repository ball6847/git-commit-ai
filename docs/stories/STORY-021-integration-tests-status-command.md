---
story_id: STORY-021
title: Integration Tests for status Command
created_at: 2026-04-14
status: Not Started
sprint: Sprint 2
epic: Epic 4 - Testing Infrastructure
---

# Story 2.12: Integration Tests for status Command

**Story ID:** STORY-021
**Priority:** Medium
**Status:** Not Started
**Sprint:** Sprint 2
**Epic:** Epic 4 - Testing Infrastructure

## User Story

As a developer, I want tests for the `status` command so that git repository detection, staged file display, and helpful messaging are verified behaviorally.

## Acceptance Criteria

### Infrastructure

- [ ] `status` command is refactored for testability (dependency injection for git ops, logger, and exit)
- [ ] `tests/integration/status-tests/` directory created

### Test Cases

- [ ] `no-repo.test.ts` — Exits with error and "Not in a git repository" message
- [ ] `no-staged-changes.test.ts` — In a clean repo, shows "Stage some changes" tip
- [ ] `staged-changes.test.ts` — In a repo with staged files, displays file list and "Ready to generate" message
- [ ] `deleted-files.test.ts` — Correctly shows deleted files in the summary

### Test Execution

- [ ] `deno task test:integration` runs all status tests
- [ ] All tests pass (< 1 second each)
- [ ] Tests are parallel-safe (isolated temp repos)

## Technical Notes

### Test Pattern

```typescript
Deno.test('status: shows staged files and ready message', () => {
  const harness = createStatusHarness();
  harness.repo.stageFile('test.ts', '// test');

  const result = harness.run();
  assertEquals(result.ok, true);
  assertStringIncludes(harness.output, 'A test.ts (added)');
  assertStringIncludes(harness.output, 'Ready to generate commit message');
  harness.cleanup();
});
```

### DI Strategy

- Inject `isGitRepository` and `getChangeSummary` scoped to temp repo
- Inject `logger` to capture output instead of console.log
- Inject `exit` to throw test-catchable error instead of `Deno.exit`

## Files to Create

1. `tests/integration/status-tests/no-repo.test.ts`
2. `tests/integration/status-tests/no-staged-changes.test.ts`
3. `tests/integration/status-tests/staged-changes.test.ts`
4. `tests/integration/status-tests/deleted-files.test.ts`

## Files to Modify

- `src/cmd/status.ts` — Add `StatusDependencies` interface and inject `isGitRepository`, `getChangeSummary`, `logger`, and `exit`

## Story Points

2

## Dependencies

- **STORY-016** (Integration Testing Framework) — pattern reference
- **STORY-015** (Dependency Injection Refactor) — pattern reference
