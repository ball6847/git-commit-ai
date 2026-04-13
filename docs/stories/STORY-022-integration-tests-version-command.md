---
story_id: STORY-022
title: Integration Tests for version Command
created_at: 2026-04-14
status: Not Started
sprint: Sprint 2
epic: Epic 4 - Testing Infrastructure
---

# Story 2.13: Integration Tests for version Command

**Story ID:** STORY-022
**Priority:** Low
**Status:** Not Started
**Sprint:** Sprint 2
**Epic:** Epic 4 - Testing Infrastructure

## User Story

As a developer, I want a simple unit/integration test for the `version` command so that version output format is verified and accidental changes to the version display are caught.

## Acceptance Criteria

### Infrastructure

- [ ] `version` command is refactored for testability (dependency injection for logger output)

### Test Cases

- [ ] `version-output.test.ts` — Calling `handleVersion()` outputs the expected version string format

### Test Execution

- [ ] `deno task test` or `deno task test:integration` runs the version test
- [ ] Test passes instantly (< 100ms)

## Technical Notes

### Test Pattern

```typescript
Deno.test('version: prints version string', () => {
  const logs: string[] = [];
  handleVersion({ logger: { log: (msg: string) => logs.push(msg) } });
  assertEquals(logs[0], 'git-commit-ai v0.2.0');
});
```

### DI Strategy

- Inject `logger` into `handleVersion` for output capture
- No external dependencies or temp directories needed

## Files to Create

1. `tests/integration/version-tests/version-output.test.ts`

## Files to Modify

- `src/cmd/version.ts` — Add `VersionDependencies` interface and inject `logger`

## Story Points

1

## Dependencies

- None
