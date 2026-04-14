---
story_id: STORY-020
title: Integration Tests for model Command
created_at: 2026-04-14
status: Completed
sprint: Sprint 2
epic: Epic 4 - Testing Infrastructure
---

# Story 2.11: Integration Tests for model Command

**Story ID:** STORY-020
**Priority:** Medium
**Status:** Not Started
**Sprint:** Sprint 2
**Epic:** Epic 4 - Testing Infrastructure

## User Story

As a developer, I want tests for the `model` command so that provider listing, availability indicators, and feature tags are verified without relying on real network calls to models.dev.

## Acceptance Criteria

### Infrastructure

- [ ] `model` command is refactored for testability (dependency injection for models.dev data source and console output)
- [ ] `tests/integration/model-tests/` directory created

### Test Cases

- [ ] `lists-providers.test.ts` — Given mock models.dev data, prints all providers and their models
- [ ] `availability-indicators.test.ts` — Shows `✓` for providers with API keys set and `✗` for those without
- [ ] `feature-tags.test.ts` — Displays `[reasoning]`, `[tools]`, `[attachments]` tags when model supports them
- [ ] `empty-data.test.ts` — Prints friendly error when models.dev data is empty
- [ ] `custom-providers.test.ts` — Merges and displays custom providers from config file

### Test Execution

- [ ] `deno task test:integration` runs all model tests
- [ ] All tests pass (< 1 second each)
- [ ] No real network requests during tests

## Technical Notes

### Test Pattern

```typescript
Deno.test('model: lists providers with availability indicators', async () => {
  const harness = createModelHarness({
    modelsDevData: MOCK_MODELS_DEV_DATA,
    envVars: { OPENAI_API_KEY: 'sk-test' },
  });

  const result = await harness.run();
  assertEquals(result.ok, true);
  assertStringIncludes(harness.output, '✓ OpenAI (openai)');
  assertStringIncludes(harness.output, '✗ Anthropic (anthropic)');
  await harness.cleanup();
});
```

### Mock Strategy

- Inject `getModelsDevData` return value directly
- Inject custom providers via config override
- Capture `console.log` output for assertions

## Files to Create

1. `tests/integration/model-tests/lists-providers.test.ts`
2. `tests/integration/model-tests/availability-indicators.test.ts`
3. `tests/integration/model-tests/feature-tags.test.ts`
4. `tests/integration/model-tests/empty-data.test.ts`
5. `tests/integration/model-tests/custom-providers.test.ts`

## Files to Modify

- `src/cmd/model.ts` — Add dependency injection for `getModelsDevData`, `getAvailableProviders`, `mergeCustomProviders`, `loadConfig`, and `logger`

## Story Points

3

## Dependencies

- **STORY-016** (Integration Testing Framework) — pattern reference
