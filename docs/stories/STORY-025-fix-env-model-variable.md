---
story_id: STORY-025
title: Fix model resolution from env var and config file
created_at: 2026-04-14
status: Completed
sprint: Sprint 3
epic: Epic 1 - CLI Simplification
---

# Story 3.3: Fix model resolution from environment variable and config file

**Story ID:** STORY-025
**Priority:** High
**Status:** Completed
**Sprint:** Sprint 3
**Epic:** Epic 1 — CLI Simplification

## User Story

As a user, I want to configure the model via environment variable or config file so that I don't have to pass `--model` every time I run `git-commit-ai generate`.

## Context

Two issues were discovered:

1. **Env var ignored**: Setting `GIT_COMMIT_AI_MODEL` in the environment fails with:
   ```
   ❌ Error: No model specified. Please provide a model using the --model option or set GIT_COMMIT_AI_MODEL environment variable.
   ```
   The validation check `if (!options.model)` runs **before** the merged `aiConfig` is computed.

2. **Config file not loaded**: The `mergeConfig` function supports `configFile?.model`, but the config file is never loaded in `handleGenerate` — it passes `undefined` for the `configFile` parameter.

## Model Resolution Priority

The model value should be resolved in this priority order:

1. `--model` CLI flag (highest) — explicit user intent for this run
2. `GIT_COMMIT_AI_MODEL` environment variable — environment-specific settings
3. `model` field in config file (`~/.config/git-commit-ai/config.json`) — persistent defaults
4. Built-in default model (lowest)

## Acceptance Criteria

- [x] `GIT_COMMIT_AI_MODEL=provider/model git-commit-ai generate` succeeds without `--model`
- [x] `--model` CLI flag overrides `GIT_COMMIT_AI_MODEL` env var
- [x] `--model` CLI flag overrides config file `model` field
- [x] `GIT_COMMIT_AI_MODEL` env var overrides config file `model` field
- [x] Config file `model` field works when neither CLI flag nor env var is set
- [x] When no model is provided via any source, the error message remains helpful
- [x] Existing tests pass
- [x] Add regression tests for all model resolution paths

## Technical Design

### Issue 1: Validation Before Merge

In `src/cmd/generate.ts`:

```typescript
// WRONG — only checks CLI flag, ignores merged config
if (!options.model) {
  logger.log(red('❌ Error: No model specified...'));
  exit(1);
}
```

`options.model` is the raw CLI option. The merged `aiConfig` is computed _after_ this check, so env vars and config files are never consulted for validation.

### Issue 2: Config File Not Loaded

```typescript
const aiConfig: AIConfig = mergeConfig(
  { model: options.model, temperature: options.temperature, maxTokens: options.maxTokens },
  envVars,
  undefined, // <-- configFile is never loaded!
  defaults,
);
```

The `loadConfig` function exists in `src/config.ts` but is not called in `handleGenerate`.

### Fix

1. Import `loadConfig` from `config.ts`
2. Load config file before computing `aiConfig`
3. Move validation to check `aiConfig.model` after merge

```typescript
import { loadConfig, mergeConfig } from '../config.ts';

// ... in handleGenerate:

const configFileResult = await loadConfig();
const configFile = configFileResult.isOk() ? configFileResult.getValue() : undefined;

const aiConfig: AIConfig = mergeConfig(
  { model: options.model, temperature: options.temperature, maxTokens: options.maxTokens },
  envVars,
  configFile,
  defaults,
);

if (!aiConfig.model) {
  logger.log(
    red(
      '❌ Error: No model specified. Please provide a model using the --model option, set GIT_COMMIT_AI_MODEL environment variable, or add "model" to your config file.',
    ),
  );
  exit(1);
}
```

### Files to Modify

- `src/cmd/generate.ts` — Load config file and fix validation to use `aiConfig.model`
- `tests/integration/generate-tests/env-model.test.ts` — Add tests for config file model resolution

## Files to Create

- None (tests added to existing test file)

## Story Points

2

## Dependencies

- None
