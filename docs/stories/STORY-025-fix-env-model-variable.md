---
story_id: STORY-025
title: Fix GIT_COMMIT_AI_MODEL environment variable ignored
created_at: 2026-04-14
status: Not Started
sprint: Sprint 3
epic: Epic 1 - CLI Simplification
---

# Story 3.3: Fix `GIT_COMMIT_AI_MODEL` environment variable being ignored

**Story ID:** STORY-025
**Priority:** High
**Status:** Not Started
**Sprint:** Sprint 3
**Epic:** Epic 1 — CLI Simplification

## User Story

As a user, I want the `GIT_COMMIT_AI_MODEL` environment variable to work correctly so that I don't have to pass `--model` every time I run `git-commit-ai generate`.

## Context

Passing `--model` on the CLI works fine, but setting `GIT_COMMIT_AI_MODEL` in the environment currently fails with:

```
❌ Error: No model specified. Please provide a model using the --model option or set GIT_COMMIT_AI_MODEL environment variable.
```

This is contradictory because the user *did* set `GIT_COMMIT_AI_MODEL`.

The root cause is in `src/cmd/generate.ts`: the validation check `if (!options.model)` runs **before** the merged `aiConfig` is used. It should instead check `aiConfig.model` (which already correctly prioritizes CLI options > env vars > config file > defaults).

## Acceptance Criteria

- [ ] `GIT_COMMIT_AI_MODEL=provider/model git-commit-ai generate` succeeds without `--model`
- [ ] `--model` still overrides `GIT_COMMIT_AI_MODEL` when both are provided
- [ ] Config file `model` field still works when neither CLI option nor env var is set
- [ ] When no model is provided via any source, the error message remains helpful
- [ ] Existing tests pass
- [ ] Add regression test for env-var model resolution

## Technical Design

### Root Cause

In `src/cmd/generate.ts`:

```typescript
// WRONG — only checks CLI flag, ignores merged config
if (!options.model) {
  logger.log(red('❌ Error: No model specified...'));
  exit(1);
}
```

`options.model` is the raw CLI option. The merged `aiConfig` is computed *after* this check, so the env var is never consulted for validation.

### Fix

Move or change the validation to check `aiConfig.model`:

```typescript
const aiConfig: AIConfig = mergeConfig(
  { model: options.model, temperature: options.temperature, maxTokens: options.maxTokens },
  envVars,
  undefined,
  defaults,
);

if (!aiConfig.model) {
  logger.log(
    red(
      '❌ Error: No model specified. Please provide a model using the --model option or set GIT_COMMIT_AI_MODEL environment variable.',
    ),
  );
  exit(1);
}
```

Then replace all subsequent references from `options.model` to `aiConfig.model` inside `handleGenerate` where appropriate (e.g., debug logging).

### Files to Modify

- `src/cmd/generate.ts` — Fix validation to use `aiConfig.model` instead of `options.model`
- `tests/integration/generate-tests/` — Add regression test for env-var model

## Files to Create

- None (or new test file if creating a dedicated env-var test)

## Story Points

1

## Dependencies

- None
