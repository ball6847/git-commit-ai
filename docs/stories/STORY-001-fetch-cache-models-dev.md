# Story: STORY-001 — Fetch and Cache models.dev Database

**Epic:** EPIC-001 (models.dev Integration)
**Sprint:** 1
**Priority:** High
**Status:** Completed
**Points:** 3
**Created:** 2026-04-12

---

## User Story

As a user of git-commit-ai, I want the tool to fetch model metadata from models.dev so that new providers and models are available automatically without code updates.

---

## Acceptance Criteria

- [ ] Fetch `https://models.dev/api.json` on first run or cache miss
- [ ] Cache response to `~/.git-commit-ai/models-cache.json`
- [ ] Cache expires after 24 hours (configurable via `GIT_COMMIT_AI_CACHE_TTL` env var, default 86400 seconds)
- [ ] Fallback to cached data if fetch fails (network error, timeout, non-200 response)
- [ ] Return empty object `{}` if no cache and fetch fails (graceful degradation)
- [ ] Module exports: `getModelsDevData()`, `refreshModelsDevCache()`, `clearModelsDevCache()`

---

## Technical Notes

### Implementation Approach

Create `src/models-dev.ts` with:

1. **Cache structure** — Reuse existing cache pattern from `src/providers/openrouter.ts`:
   - Cache dir: `~/.git-commit-ai/`
   - Cache file: `models-cache.json`
   - Format: `{ data: ModelsDevResponse, timestamp: number }`

2. **Fetch logic**:
   - Check cache first (TTL-based expiration)
   - If expired or missing, fetch from `https://models.dev/api.json`
   - On success: save to cache, return data
   - On failure: return cached data if available, else `{}`

3. **Type definitions** — Define interfaces for models.dev response:
   ```typescript
   interface ModelsDevProvider {
     id: string;
     name: string;
     env: string[]; // e.g., ["ANTHROPIC_API_KEY"]
     npm: string; // e.g., "@ai-sdk/anthropic"
     api?: string; // e.g., "https://api.anthropic.com"
     models: Record<string, ModelsDevModel>;
   }

   interface ModelsDevModel {
     id: string;
     name: string;
     attachment: boolean;
     reasoning: boolean;
     tool_call: boolean;
     temperature: boolean;
     cost?: { input: number; output: number; cache_read?: number; cache_write?: number };
     limit?: { context: number; output: number };
   }

   type ModelsDevResponse = Record<string, ModelsDevProvider>;
   ```

### Reference: models.dev API Response Structure

```jsonc
{
  "anthropic": {
    "id": "anthropic",
    "name": "Anthropic",
    "env": ["ANTHROPIC_API_KEY"],
    "npm": "@ai-sdk/anthropic",
    "models": {
      "claude-sonnet-4-5": {
        "id": "claude-sonnet-4-5",
        "name": "Claude Sonnet 4.5",
        "attachment": true,
        "reasoning": true,
        "tool_call": true,
        "temperature": true,
        "cost": { "input": 3, "output": 15 },
        "limit": { "context": 200000, "output": 64000 }
      }
    }
  },
  "openai": {
    "id": "openai",
    "name": "OpenAI",
    "env": ["OPENAI_API_KEY"],
    "npm": "@ai-sdk/openai",
    "models": {/* ... */}
  }
  // ... more providers
}
```

---

## Files to Create

| File                | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `src/models-dev.ts` | New module for models.dev fetching, caching, and type definitions |

## Files to Modify

| File        | Change                                                          |
| ----------- | --------------------------------------------------------------- |
| `deno.json` | Add `@std/async` import for `delay()` if needed for retry logic |

---

## Gherkin Scenarios

### Scenario 1: First run fetches from API

```gherkin
Given no cache file exists
When I call getModelsDevData()
Then it fetches from https://models.dev/api.json
And saves response to ~/.git-commit-ai/models-cache.json
And returns the fetched data
```

### Scenario 2: Cached data used within TTL

```gherkin
Given cache file exists with timestamp less than 24 hours ago
When I call getModelsDevData()
Then it returns cached data without fetching
```

### Scenario 3: Cache expired triggers refresh

```gherkin
Given cache file exists with timestamp more than 24 hours ago
When I call getModelsDevData()
Then it fetches fresh data from https://models.dev/api.json
And updates the cache file
And returns the fresh data
```

### Scenario 4: Fetch failure falls back to cache

```gherkin
Given cache file exists (even if expired)
And network fetch fails
When I call getModelsDevData()
Then it returns the cached data
And logs a warning about fetch failure
```

### Scenario 5: No cache and fetch failure

```gherkin
Given no cache file exists
And network fetch fails
When I call getModelsDevData()
Then it returns an empty object {}
And logs a warning
```

---

## Definition of Done

- [ ] `src/models-dev.ts` module created with all exports
- [ ] All Gherkin scenarios pass manual verification
- [ ] Types defined for models.dev response structure
- [ ] Cache file created at `~/.git-commit-ai/models-cache.json`
- [ ] 24-hour TTL with env var override works
- [ ] Graceful fallback on fetch failure
- [ ] `deno check src/models-dev.ts` passes
- [ ] `deno lint` passes
- [ ] No breaking changes to existing functionality
