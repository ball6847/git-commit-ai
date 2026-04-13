# STORY-010: Custom Provider & Extension Registration

**Story ID:** STORY-010
**Priority:** High
**Status:** Implemented
**Epic:** Epic 1 — Configuration File Support
**Created:** 2026-04-13

---

## User Story

As a user of git-commit-ai, I want to define custom providers in my config file so that I can use new AI models that aren't yet listed in models.dev, without waiting for an upstream update.

---

## Context

While models.dev provides a large catalog, it may not include every provider or model. Users who want to use a new provider (e.g., a self-hosted model, a newly released model, or a private API) currently have no way to add it without modifying the codebase.

---

## Acceptance Criteria

- [x] Custom providers in config file are resolved alongside models.dev providers
- [x] Custom providers can specify `npm` (bundled SDK), `api` (openai-compatible URL), and `env` (env var names for API key)
- [x] Custom providers appear in `model` command output with a custom marker (e.g., `[custom]`)
- [x] Custom providers work with `--model custom-provider/model-id`
- [x] Provider extension: can add models to an existing models.dev provider via `extend: true`
- [x] Conflicting provider IDs: config definition merges/extends models.dev, with a console warning for full overrides

---

## Technical Design

### Custom Provider Config

A new provider that doesn't exist in models.dev:

```json
{
  "providers": {
    "my-llm": {
      "npm": "@ai-sdk/openai-compatible",
      "api": "https://llm.my-company.com/v1",
      "env": ["MY_LLM_API_KEY"],
      "models": {
        "my-model-v1": {
          "name": "My Custom Model v1",
          "reasoning": true,
          "tool_call": true
        }
      }
    }
  }
}
```

### Provider Extension

Adding models to an existing models.dev provider:

```json
{
  "providers": {
    "anthropic": {
      "extend": true,
      "models": {
        "my-claude-finetune": {
          "name": "My Claude Fine-Tune",
          "reasoning": true,
          "tool_call": true
        }
      }
    }
  }
}
```

When `extend: true`:

- The models are merged into the existing `anthropic` provider from models.dev
- The provider's `env` and `npm` are inherited from models.dev
- User just needs the standard `ANTHROPIC_API_KEY`

When `extend` is absent or `false`:

- A completely new provider entry is created
- User must provide `npm`, `api`, and `env`

### Module Changes

**`src/models-dev.ts`:**

- Add `mergeCustomProviders(data: ModelsDevResponse, customProviders: Record<string, CustomProviderConfig>): ModelsDevResponse`
- For `extend: true`: merge models into existing provider, warn if provider doesn't exist in models.dev
- For `extend: false` or absent: create new `ModelsDevProvider` entry
- Custom providers with `api` field but no `npm` default to `@ai-sdk/openai-compatible`
- `getAvailableProviders()` works transparently with merged data (no changes needed)

**`src/cmd/model.ts`:**

- Mark custom providers with `⚙` or `[custom]` in the model list
- Show extended models with `[extended]` tag

**`src/ai.ts`:**

- `getLanguageModel()` uses the merged data (models.dev + custom providers)
- No special handling needed — custom providers appear as normal providers in the merged data

---

## Files to Create

- None

## Files to Modify

- `src/models-dev.ts` — Add `mergeCustomProviders()` function
- `src/config.ts` — Export custom providers from loaded config
- `src/cmd/model.ts` — Display custom providers with marker, show extended models
- `src/ai.ts` — Resolve custom providers in model lookup (via merged data)
- `src/types.ts` — Add `CustomProviderConfig`, `CustomModelConfig` (or confirm from STORY-009)

---

## Out of Scope

- Dynamic npm package installation for custom SDK providers
- Config schema validation beyond basic checks
- Provider health checking / connectivity tests

---

## Dependencies

- STORY-009 (Config file loading must exist first)
- `models-dev.ts` existing provider infrastructure
