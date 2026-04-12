# Story: STORY-002 — Dynamic Provider Resolution

**Epic:** EPIC-001 (models.dev Integration)
**Sprint:** 1
**Priority:** High
**Status:** Not Started
**Points:** 2
**Created:** 2026-04-12
**Depends on:** STORY-001

---

## User Story

As a user of git-commit-ai, I want the tool to automatically detect which providers are available based on my environment variables so that I only see models I can actually use.

---

## Acceptance Criteria

- [ ] Read provider `env` field from models.dev data (e.g., `["ANTHROPIC_API_KEY"]`)
- [ ] Check if any corresponding env var is set via `Deno.env.get()`
- [ ] Provider marked as "available" if at least one env var from `env` array is set
- [ ] Export `getAvailableProviders()` returning list of providers with valid credentials
- [ ] Export `isProviderAvailable(providerId)` for single provider check
- [ ] Return API key value alongside provider info (for SDK initialization)

---

## Technical Notes

### Implementation

Extend `src/models-dev.ts` (from STORY-001):

```typescript
interface AvailableProvider {
  id: string; // e.g., "anthropic"
  name: string; // e.g., "Anthropic"
  apiKey: string; // resolved env var value
  npm: string; // e.g., "@ai-sdk/anthropic"
  api?: string; // base URL if applicable
  models: ModelsDevModel[];
}

export function getAvailableProviders(data: ModelsDevResponse): AvailableProvider[];
export function isProviderAvailable(data: ModelsDevResponse, providerId: string): boolean;
export function getProviderApiKey(provider: ModelsDevProvider): string | null;
```

### Provider Resolution Logic

```typescript
export function getProviderApiKey(provider: ModelsDevProvider): string | null {
  for (const envVar of provider.env) {
    const value = Deno.env.get(envVar);
    if (value) return value;
  }
  return null;
}

export function getAvailableProviders(data: ModelsDevResponse): AvailableProvider[] {
  return Object.values(data)
    .map((provider) => {
      const apiKey = getProviderApiKey(provider);
      if (!apiKey) return null;
      return {
        id: provider.id,
        name: provider.name,
        apiKey,
        npm: provider.npm,
        api: provider.api,
        models: Object.values(provider.models),
      };
    })
    .filter((p): p is AvailableProvider => p !== null);
}
```

### Example: How Provider Discovery Works

```
Environment:
  ANTHROPIC_API_KEY=sk-ant-xxx
  OPENAI_API_KEY=sk-xxx
  # No CEREBRAS_API_KEY set

models.dev data has: anthropic, openai, cerebras, google, ...

Result from getAvailableProviders():
  [
    { id: "anthropic", apiKey: "sk-ant-xxx", ... },
    { id: "openai", apiKey: "sk-xxx", ... }
    // cerebras, google excluded (no API key)
  ]
```

---

## Files to Modify

| File                | Change                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| `src/models-dev.ts` | Add `getAvailableProviders()`, `isProviderAvailable()`, `getProviderApiKey()` |

---

## Gherkin Scenarios

### Scenario 1: Provider with matching env var is available

```gherkin
Given models.dev has provider "anthropic" with env ["ANTHROPIC_API_KEY"]
And environment variable ANTHROPIC_API_KEY is set to "sk-ant-xxx"
When I call getAvailableProviders()
Then the result includes anthropic with apiKey "sk-ant-xxx"
```

### Scenario 2: Provider without env var is excluded

```gherkin
Given models.dev has provider "google" with env ["GOOGLE_API_KEY"]
And environment variable GOOGLE_API_KEY is not set
When I call getAvailableProviders()
Then the result does not include google
```

### Scenario 3: Provider with multiple env vars uses first match

```gherkin
Given models.dev has provider "openrouter" with env ["OPENROUTER_API_KEY", "OR_API_KEY"]
And environment variable OR_API_KEY is set to "or-key-xxx"
And environment variable OPENROUTER_API_KEY is not set
When I call getProviderApiKey(openrouter)
Then it returns "or-key-xxx"
```

---

## Definition of Done

- [ ] `getAvailableProviders()` returns correct filtered list
- [ ] `isProviderAvailable()` returns correct boolean
- [ ] `getProviderApiKey()` resolves first matching env var
- [ ] `deno check src/models-dev.ts` passes
- [ ] `deno lint` passes
