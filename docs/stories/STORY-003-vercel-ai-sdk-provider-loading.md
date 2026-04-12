# Story: STORY-003 — Vercel AI SDK Provider Loading

**Epic:** EPIC-001 (models.dev Integration)
**Sprint:** 1
**Priority:** High
**Status:** Not Started
**Points:** 3
**Created:** 2026-04-12
**Depends on:** STORY-002

---

## User Story

As a user of git-commit-ai, I want models.dev providers to work with the Vercel AI SDK so that I can use any provider through a unified interface.

---

## Acceptance Criteria

- [ ] Map models.dev `npm` field to Vercel AI SDK provider constructors
- [ ] Support bundled providers: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/cerebras`, `@ai-sdk/openai-compatible`, `@openrouter/ai-sdk-provider`
- [ ] For providers with `api` field, use `createOpenAICompatible({ baseURL, apiKey })`
- [ ] For OpenRouter, use existing `@openrouter/ai-sdk-provider`
- [ ] Return `LanguageModelV2` compatible instance via `provider(modelId)`
- [ ] Cache SDK instances to avoid duplicate initialization
- [ ] Clear error message if npm package not in bundled list

---

## Technical Notes

### Implementation

Extend `src/models-dev.ts`:

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createCerebras } from '@ai-sdk/cerebras';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModelV2, ProviderV2 } from '@ai-sdk/provider';

// Map of npm package name → SDK factory function
const BUNDLED_SDK_FACTORIES: Record<
  string,
  (opts: { apiKey: string; baseURL?: string }) => ProviderV2
> = {
  '@ai-sdk/anthropic': (opts) => createAnthropic(opts),
  '@ai-sdk/openai': (opts) => createOpenAI(opts),
  '@ai-sdk/cerebras': (opts) => createCerebras(opts),
  '@ai-sdk/openai-compatible': (opts) => createOpenAICompatible(opts),
  '@openrouter/ai-sdk-provider': (opts) => createOpenRouter(opts),
};

// Cache for SDK instances
const sdkCache = new Map<string, ProviderV2>();

export function getProviderSDK(provider: AvailableProvider): ProviderV2 {
  const cacheKey = `${provider.npm}:${provider.apiKey}`;

  if (sdkCache.has(cacheKey)) {
    return sdkCache.get(cacheKey)!;
  }

  const factory = BUNDLED_SDK_FACTORIES[provider.npm];
  if (!factory) {
    // Fallback: use openai-compatible for unknown providers with api field
    if (provider.api) {
      const sdk = createOpenAICompatible({
        apiKey: provider.apiKey,
        baseURL: provider.api,
      });
      sdkCache.set(cacheKey, sdk);
      return sdk;
    }
    throw new Error(
      `Provider "${provider.id}" uses npm package "${provider.npm}" which is not bundled. ` +
        `Supported: ${Object.keys(BUNDLED_SDK_FACTORIES).join(', ')}`,
    );
  }

  const opts: { apiKey: string; baseURL?: string } = { apiKey: provider.apiKey };
  if (provider.api && provider.npm === '@ai-sdk/openai-compatible') {
    opts.baseURL = provider.api;
  }

  const sdk = factory(opts);
  sdkCache.set(cacheKey, sdk);
  return sdk;
}

export function getModelFromProvider(
  provider: AvailableProvider,
  modelId: string,
): LanguageModelV2 {
  const sdk = getProviderSDK(provider);
  return sdk.languageModel(modelId);
}
```

### Provider → SDK Mapping

| models.dev `npm`              | SDK Package                   | Factory Function                    |
| ----------------------------- | ----------------------------- | ----------------------------------- |
| `@ai-sdk/anthropic`           | `@ai-sdk/anthropic`           | `createAnthropic`                   |
| `@ai-sdk/openai`              | `@ai-sdk/openai`              | `createOpenAI`                      |
| `@ai-sdk/cerebras`            | `@ai-sdk/cerebras`            | `createCerebras`                    |
| `@ai-sdk/openai-compatible`   | `@ai-sdk/openai-compatible`   | `createOpenAICompatible`            |
| `@openrouter/ai-sdk-provider` | `@openrouter/ai-sdk-provider` | `createOpenRouter`                  |
| _(any with `api` field)_      | `@ai-sdk/openai-compatible`   | `createOpenAICompatible` (fallback) |

---

## Files to Modify

| File                | Change                                                                            |
| ------------------- | --------------------------------------------------------------------------------- |
| `src/models-dev.ts` | Add `BUNDLED_SDK_FACTORIES`, `getProviderSDK()`, `getModelFromProvider()`         |
| `deno.json`         | Add `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/openai-compatible` if missing |

---

## Gherkin Scenarios

### Scenario 1: Bundled provider loads correctly

```gherkin
Given provider "anthropic" with npm "@ai-sdk/anthropic" and apiKey "sk-ant-xxx"
When I call getProviderSDK(anthropic)
Then it returns a valid SDK instance
And sdk.languageModel("claude-sonnet-4-5") returns a LanguageModelV2
```

### Scenario 2: OpenAI-compatible provider uses api field

```gherkin
Given provider "groq" with npm "@ai-sdk/openai-compatible" and api "https://api.groq.com/openai/v1"
And apiKey "gsk_xxx"
When I call getProviderSDK(groq)
Then it returns SDK configured with baseURL "https://api.groq.com/openai/v1"
```

### Scenario 3: Unknown provider with api field falls back

```gherkin
Given provider "custom" with npm "@ai-sdk/unknown" and api "https://custom.api/v1"
And apiKey "key-xxx"
When I call getProviderSDK(custom)
Then it falls back to createOpenAICompatible with baseURL "https://custom.api/v1"
```

### Scenario 4: SDK instance is cached

```gherkin
Given I called getProviderSDK(anthropic) once
When I call getProviderSDK(anthropic) again with same apiKey
Then it returns the same SDK instance (cached)
```

### Scenario 5: Unknown provider without api field throws error

```gherkin
Given provider "unknown" with npm "@ai-sdk/unknown" and no api field
When I call getProviderSDK(unknown)
Then it throws an error with message listing supported packages
```

---

## Definition of Done

- [ ] All bundled providers load correctly
- [ ] OpenAI-compatible fallback works for providers with `api` field
- [ ] SDK instances are cached
- [ ] `deno check src/models-dev.ts` passes
- [ ] `deno lint` passes
- [ ] Existing provider modules still work (backward compatible)
