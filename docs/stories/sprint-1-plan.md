# Sprint 1 Plan: git-commit-ai

**Sprint:** 1
**Project:** git-commit-ai
**Level:** 0 (Single atomic change)
**Created:** 2026-04-12
**Status:** Active

---

## Sprint Goal

Integrate **models.dev** as an external model database to enable dynamic provider support — automatically discovering and loading AI providers based on available API keys, without code changes when new providers are added to models.dev.

---

## Architecture (Simplified from OpenCode)

```
┌──────────────────────────────────────────────────────┐
│                   git-commit-ai                       │
│                                                       │
│  ┌─────────────┐    ┌──────────────┐                  │
│  │  models.dev │───▶│  Provider    │                  │
│  │  api.json   │    │  Loader      │                  │
│  │  (cached)   │    │  (resolve +  │                  │
│  └─────────────┘    │   discover)  │                  │
│                     └──────┬───────┘                  │
│  ┌─────────────┐    ┌──────▼───────┐                  │
│  │  .env /     │───▶│  Vercel AI   │                  │
│  │  env vars   │    │  SDK         │                  │
│  │  (API keys) │    │  (existing)  │                  │
│  └─────────────┘    └──────────────┘                  │
└──────────────────────────────────────────────────────┘
```

---

## Epic 1: models.dev Integration

**Epic ID:** EPIC-001
**Priority:** High
**Status:** Not Started

### Story 1.1: Fetch and Cache models.dev Database

**Story ID:** STORY-001
**Priority:** High
**Status:** Not Started

**User Story:**
As a user of git-commit-ai, I want the tool to fetch model metadata from models.dev so that new providers and models are available automatically without code updates.

**Acceptance Criteria:**

- [ ] Fetch `https://models.dev/api.json` on first run
- [ ] Cache response to `~/.git-commit-ai/models-cache.json`
- [ ] Cache expires after 24 hours (configurable)
- [ ] Fallback to cached data if fetch fails
- [ ] Graceful degradation if models.dev is unreachable

**Technical Notes:**

- Create `src/models-dev.ts` module
- Use existing cache pattern from `src/providers/openrouter.ts` (CACHE_DIR, CACHE_FILE)
- Response structure: `{ [providerId]: { env: string[], npm: string, api?: string, models: {...} } }`

**Files to Create:**

- `src/models-dev.ts`

**Files to Modify:**

- None (new module)

---

### Story 1.2: Dynamic Provider Resolution

**Story ID:** STORY-002
**Priority:** High
**Status:** Not Started

**User Story:**
As a user of git-commit-ai, I want the tool to automatically detect which providers are available based on my environment variables so that I only see models I can actually use.

**Acceptance Criteria:**

- [ ] Read provider `env` field from models.dev data
- [ ] Check if corresponding env var is set (e.g., `ANTHROPIC_API_KEY` → Anthropic available)
- [ ] Only list models from providers with valid credentials
- [ ] Support existing hardcoded providers as fallback

**Technical Notes:**

- For each provider in models.dev data, check `provider.env` array against `Deno.env`
- Build available models list from providers with credentials
- Keep existing provider modules as fallback/bundled option

**Files to Create:**

- None

**Files to Modify:**

- `src/models-dev.ts` (extend from Story 1.1)

---

### Story 1.3: Vercel AI SDK Provider Loading

**Story ID:** STORY-003
**Priority:** High
**Status:** Not Started

**User Story:**
As a user of git-commit-ai, I want models.dev providers to work with the Vercel AI SDK so that I can use any provider through a unified interface.

**Acceptance Criteria:**

- [ ] Map models.dev `npm` field to Vercel AI SDK provider constructors
- [ ] Support bundled providers: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/cerebras`, etc.
- [ ] Support `@ai-sdk/openai-compatible` for providers with `api` field
- [ ] Pass API key from discovered env var to provider constructor
- [ ] Return `LanguageModelV2` compatible instance

**Technical Notes:**

- Create provider constructor map: `{ "@ai-sdk/anthropic": createAnthropic, ... }`
- For providers with `api` field, use `createOpenAICompatible({ baseURL: provider.api, apiKey })`
- For OpenRouter, use existing `@openrouter/ai-sdk-provider`
- Import needed SDK packages in `deno.json`

**Files to Create:**

- None

**Files to Modify:**

- `src/models-dev.ts` (extend)
- `deno.json` (add missing AI SDK imports)

---

### Story 1.4: Update Model Listing Command

**Story ID:** STORY-004
**Priority:** Medium
**Status:** Not Started

**User Story:**
As a user of git-commit-ai, I want to see all available models from models.dev in the `model` command so that I can discover and select from the full catalog.

**Acceptance Criteria:**

- [ ] `model` command shows models from models.dev (grouped by provider)
- [ ] Mark which providers are available (have API key) vs unavailable
- [ ] Keep existing hardcoded models as fallback if models.dev fetch fails
- [ ] Support model selection via `--model provider/model-id` format

**Technical Notes:**

- Modify `src/cmd/model.ts` to integrate models.dev data
- Display format: `provider/model-id` (e.g., `anthropic/claude-sonnet-4-5`)
- Indicate availability status (✓ available, ✗ no API key)

**Files to Create:**

- None

**Files to Modify:**

- `src/cmd/model.ts`
- `src/models-dev.ts` (add listing helpers)

---

### Story 1.5: Update Generate/Commit to Use models.dev

**Story ID:** STORY-005
**Priority:** High
**Status:** Not Started

**User Story:**
As a user of git-commit-ai, I want to use any model from models.dev with the `generate` and `commit` commands so that I can leverage the full ecosystem of AI providers.

**Acceptance Criteria:**

- [ ] `--model provider/model-id` resolves via models.dev data
- [ ] Falls back to existing provider logic if models.dev lookup fails
- [ ] Clear error message if provider not found or no API key
- [ ] Existing `--model cerebras/zai-glm-4.6` format still works

**Technical Notes:**

- Modify `src/ai.ts` `getLanguageModel()` to check models.dev first
- Parse `provider/model-id` format, look up in models.dev data
- Use loaded provider SDK instance for `generateText()` call
- Keep existing provider modules as fallback

**Files to Create:**

- None

**Files to Modify:**

- `src/ai.ts`
- `src/models-dev.ts` (add model resolution)

---

### Story 1.6: Update Tests

**Story ID:** STORY-006
**Priority:** Medium
**Status:** Not Started

**User Story:**
As a developer, I want test coverage for the models.dev integration so that I can ensure reliability and catch regressions.

**Acceptance Criteria:**

- [ ] Test models.dev API fetching and caching
- [ ] Test provider discovery from env vars
- [ ] Test model resolution with mock data
- [ ] Test fallback behavior when models.dev unavailable

**Technical Notes:**

- Add tests to `tests/main_test.ts`
- Mock fetch responses for models.dev API
- Mock environment variables for provider discovery

**Files to Create:**

- None

**Files to Modify:**

- `tests/main_test.ts`

---

## Sprint Metrics

| Metric            | Value            |
| ----------------- | ---------------- |
| Total Stories     | 6                |
| Story Points      | 13 (3+2+3+2+2+1) |
| Sprint Duration   | 1-2 weeks        |
| Target Completion | 2026-04-26       |

---

## Dependencies

- models.dev API availability (`https://models.dev/api.json`)
- Vercel AI SDK provider packages (already in use)

---

## Risks

| Risk                              | Impact | Mitigation                                                     |
| --------------------------------- | ------ | -------------------------------------------------------------- |
| models.dev API downtime           | Medium | Cache aggressively, fallback to hardcoded providers            |
| Provider SDK incompatibility      | Low    | Use `@ai-sdk/openai-compatible` as universal fallback          |
| Breaking existing model selection | High   | Keep existing provider modules, add models.dev as layer on top |
| Rate limiting on models.dev       | Low    | 24-hour cache, only fetch on cache miss                        |

---

## Key Design Decisions

1. **Additive approach** — models.dev integration adds on top of existing providers, doesn't replace them
2. **Cache-first** — Aggressive caching (24h) minimizes API calls to models.dev
3. **Env var discovery** — Providers auto-activate when their API key env var is set
4. **`@ai-sdk/openai-compatible` fallback** — Any provider with an `api` base URL can work via this universal adapter
5. **No dynamic npm install** — Unlike OpenCode, we only use pre-bundled AI SDK packages (simpler, Deno-compatible)

---

## Definition of Done

- [ ] All stories completed
- [ ] Tests passing (`deno test`)
- [ ] Lint passing (`deno lint`)
- [ ] Type check passing (`deno check`)
- [ ] Documentation updated (README, .env.example)
- [ ] Existing functionality preserved (backward compatible)
- [ ] `model` command shows models.dev catalog
- [ ] `generate --model provider/model-id` works with models.dev providers
