# Story: STORY-005 — Update Generate/Commit to Use models.dev

**Epic:** EPIC-001 (models.dev Integration)
**Sprint:** 1
**Priority:** High
**Status:** Completed
**Points:** 2
**Created:** 2026-04-12
**Depends on:** STORY-003

---

## User Story

As a user of git-commit-ai, I want to use any model from models.dev with the `generate` and `commit` commands so that I can leverage the full ecosystem of AI providers.

---

## Acceptance Criteria

- [x] `--model provider/model-id` resolves via models.dev data
- [x] Falls back to existing provider logic if models.dev lookup fails
- [x] Clear error message if provider not found or no API key
- [x] Existing `--model cerebras/zai-glm-4.6` format still works
- [x] Both `generate` and `commit` commands support models.dev models

---

## Technical Notes

### Implementation

Modify `src/ai.ts` — update `getLanguageModel()`:

```typescript
import {
  getAvailableProviders,
  getModelFromProvider,
  getModelsDevData,
  isProviderAvailable,
} from './models-dev.ts';

export async function getLanguageModel(modelName: string): Promise<LanguageModelV2> {
  // Check if model name contains "/" (provider/model-id format)
  const slashIndex = modelName.indexOf('/');

  if (slashIndex > 0) {
    const providerId = modelName.substring(0, slashIndex);
    const modelId = modelName.substring(slashIndex + 1);

    // Try models.dev first
    const data = await getModelsDevData();
    if (Object.keys(data).length > 0) {
      const providers = getAvailableProviders(data);
      const provider = providers.find((p) => p.id === providerId);

      if (provider) {
        return getModelFromProvider(provider, modelId);
      }

      // Provider exists in models.dev but no API key
      if (data[providerId]) {
        throw new Error(
          `Provider "${providerId}" requires API key. ` +
            `Set one of: ${data[providerId].env.join(', ')}`,
        );
      }
    }
  }

  // Fallback to existing provider logic
  const config = initializeAI(modelName);
  const models = await getAllModels();
  const model = models[modelName];

  if (!model) {
    throw new Error(
      `Model "${modelName}" not found. ` +
        `Run "git-commit-ai model" to see available models.`,
    );
  }

  return model;
}
```

### Resolution Order

```
1. Check if model name has "/" (provider/model-id format)
   └─ YES → Try models.dev resolution
              └─ Provider found + API key available → Use models.dev SDK
              └─ Provider found + no API key → Error with env var hint
              └─ Provider not found → Fall through to step 2
   └─ NO → Fall through to step 2

2. Fall back to existing provider modules
   └─ Model found in built-in providers → Use existing logic
   └─ Model not found → Error with suggestion
```

### Example Usage

```bash
# Use Anthropic model via models.dev
git-commit-ai generate --model anthropic/claude-sonnet-4-5

# Use OpenAI model via models.dev
git-commit-ai generate --model openai/gpt-4o

# Use existing built-in model (still works)
git-commit-ai generate --model cerebras/zai-glm-4.6

# Error: provider exists but no API key
git-commit-ai generate --model anthropic/claude-sonnet-4-5
# Error: Provider "anthropic" requires API key. Set one of: ANTHROPIC_API_KEY
```

---

## Files to Modify

| File        | Change                                                |
| ----------- | ----------------------------------------------------- |
| `src/ai.ts` | Update `getLanguageModel()` to resolve via models.dev |

---

## Gherkin Scenarios

### Scenario 1: models.dev model resolves correctly

```gherkin
Given models.dev has provider "anthropic" with model "claude-sonnet-4-5"
And ANTHROPIC_API_KEY is set
When I call getLanguageModel("anthropic/claude-sonnet-4-5")
Then it returns a valid LanguageModelV2 instance
```

### Scenario 2: Existing model format still works

```gherkin
Given built-in provider has model "cerebras/zai-glm-4.6"
When I call getLanguageModel("cerebras/zai-glm-4.6")
Then it returns a valid LanguageModelV2 instance via existing logic
```

### Scenario 3: Provider exists but no API key

```gherkin
Given models.dev has provider "openai"
And OPENAI_API_KEY is not set
When I call getLanguageModel("openai/gpt-4o")
Then it throws error: "Provider "openai" requires API key. Set one of: OPENAI_API_KEY"
```

### Scenario 4: Fallback when models.dev unavailable

```gherkin
Given models.dev fetch fails
When I call getLanguageModel("anthropic/claude-sonnet-4-5")
Then it falls back to existing provider resolution
```

---

## Definition of Done

- [x] `--model provider/model-id` works with models.dev providers
- [x] Existing model selection still works
- [x] Clear error messages for missing API keys
- [x] `deno check src/ai.ts` passes
- [x] `deno lint` passes
- [x] Manual test: `git-commit-ai generate --model anthropic/claude-sonnet-4-5` (with API key)
