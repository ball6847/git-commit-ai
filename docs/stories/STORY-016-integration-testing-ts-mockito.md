---
story_id: STORY-016
title: Integration Testing with ts-mockito
created_at: 2026-04-13
status: Completed
sprint: Sprint 2
epic: Epic 4 - Testing Infrastructure
---

# Story 2.9: Integration Testing with ts-mockito

**Story ID:** STORY-016
**Priority:** High
**Status:** Completed
**Sprint:** Sprint 2
**Epic:** Epic 4 - Testing Infrastructure

## User Story

As a developer, I want comprehensive integration tests for all `generate` command flags using ts-mockito and real git sandboxes so that flag behaviors are verified behaviorally (not by implementation) and regressions are caught early.

## Acceptance Criteria

### Infrastructure

- [x] `ts-mockito` added to `deno.json` imports (`npm:ts-mockito@^2.6.1`)
- [x] `test:integration` task added to `deno.json`
- [x] Directory structure created: `tests/integration/helpers/` and `tests/integration/flag-tests/`

### Test Helpers

- [x] `temp-repo.ts` created with `createTempRepo()`, `stageFile()`, `getLog()`, `isCommitted()`, `cleanup()`
- [x] `mockito-harness.ts` created with `createMockitoHarness()` returning AI mock + console capture
- [x] `test-harness.ts` created combining temp-repo + mockito-harness with `run()` method

### Flag Tests

- [x] `model-flag.test.ts` - Asserts model ID passed to AI config
- [x] `message-flag.test.ts` - Asserts user message passed to AI
- [x] `ai-params.test.ts` - Asserts temperature and maxTokens in AI config
- [x] `debug-flag.test.ts` - Asserts debug output contains diff and model info
- [x] `dry-run-flag.test.ts` - Asserts AI called but commit NOT in git log
- [x] `yes-flag.test.ts` - Asserts commit IS in git log without prompt
- [x] `push-flag.test.ts` - Asserts commit pushed to bare remote repo
- [x] `combinations.test.ts` - Asserts multiple flags work together

### Test Execution

- [x] `deno task test:integration` runs all flag tests
- [x] All tests pass (< 2 seconds each)
- [x] Tests are parallel-safe (isolated temp repos)
- [x] Tests clean up temp directories (no pollution)

## Technical Notes

### Test Pattern

Each test follows this pattern (~10 lines):

```typescript
Deno.test('flag-name: expected behavior', async () => {
  const harness = await createHarness();
  try {
    await harness.repo.stageFile('test.ts', '// test');
    harness.mock.setResponse('feat: test');

    await harness.run({ model: 'test-model', flag: value });

    // Assert behavior, not implementation
    assertEquals(await harness.repo.isCommitted('feat: test'), expected);
  } finally {
    await harness.cleanup();
  }
});
```

### Behavior vs Implementation

**Behavioral assertions** (what we test):

- Commit exists in git log (not which git command ran)
- AI received model in config (not how it was called)
- Debug output contains text (not what console.log received)

**Implementation assertions** (avoid):

- Which exact git command was spawned
- How many times a function was called
- Internal variable values

### File Structure

```
tests/integration/
├── helpers/
│   ├── temp-repo.ts          # Git sandboxing
│   ├── mockito-harness.ts    # ts-mockito mocks
│   └── test-harness.ts       # Unified interface
├── flag-tests/
│   ├── model-flag.test.ts
│   ├── message-flag.test.ts
│   ├── ai-params.test.ts
│   ├── debug-flag.test.ts
│   ├── dry-run-flag.test.ts
│   ├── yes-flag.test.ts
│   ├── push-flag.test.ts
│   └── combinations.test.ts
└── README.md                 # Testing documentation
```

### Dependencies

- `STORY-015` must be completed first (dependency injection required)
- `ts-mockito` npm package
- `Deno.makeTempDir` API

## Files to Create

1. `tests/integration/helpers/temp-repo.ts`
2. `tests/integration/helpers/mockito-harness.ts`
3. `tests/integration/helpers/test-harness.ts`
4. `tests/integration/flag-tests/model-flag.test.ts`
5. `tests/integration/flag-tests/message-flag.test.ts`
6. `tests/integration/flag-tests/ai-params.test.ts`
7. `tests/integration/flag-tests/debug-flag.test.ts`
8. `tests/integration/flag-tests/dry-run-flag.test.ts`
9. `tests/integration/flag-tests/yes-flag.test.ts`
10. `tests/integration/flag-tests/push-flag.test.ts`
11. `tests/integration/flag-tests/combinations.test.ts`
12. `tests/integration/README.md`

## Files to Modify

- `deno.json` - Add ts-mockito import and test:integration task

## Story Points

5

## Dependencies

- **STORY-015** (Dependency Injection Refactor) - BLOCKING
- `ts-mockito` npm package

## Notes

This story delivers the complete integration testing framework for flag verification. It depends on STORY-015 because we need dependency injection to mock the AI module and capture console output.

The testing approach uses **real git repositories** (not mocks) to ensure actual behavior is tested, while **ts-mockito** mocks the external AI service. This gives us confidence in the git operations while keeping tests fast and deterministic.
