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

Automatically fetch, cache, and integrate models.dev provider metadata with dynamic resolution and Vercel AI SDK loading.

### Stories

| Story     | Title                                                       | File                                                                                                       | Points |
| --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| STORY-001 | Fetch and Cache models.dev Database                         | [STORY-001-fetch-cache-models-dev.md](./STORY-001-fetch-cache-models-dev.md)                               | 3      |
| STORY-002 | Dynamic Provider Resolution                                 | [STORY-002-dynamic-provider-resolution.md](./STORY-002-dynamic-provider-resolution.md)                     | 2      |
| STORY-003 | Vercel AI SDK Provider Loading                              | [STORY-003-vercel-ai-sdk-provider-loading.md](./STORY-003-vercel-ai-sdk-provider-loading.md)               | 3      |
| STORY-004 | Update Model Listing Command                                | [STORY-004-update-model-listing-command.md](./STORY-004-update-model-listing-command.md)                   | 2      |
| STORY-005 | Update Generate/Commit to Use models.dev                    | [STORY-005-update-generate-commit-use-models-dev.md](./STORY-005-update-generate-commit-use-models-dev.md) | 2      |
| STORY-006 | Update Tests for models.dev Integration                     | [STORY-006-tests-models-dev-integration.md](./STORY-006-tests-models-dev-integration.md)                   | 1      |
| STORY-007 | Add attribution/credits for models.dev and AI SDK to README | [STORY-007-credit-models-dev-ai-sdk.md](./STORY-007-credit-models-dev-ai-sdk.md)                           | 1      |

---

## Sprint Metrics

| Metric            | Value      |
| ----------------- | ---------- |
| Total Stories     | 7          |
| Story Points      | 14         |
| Sprint Duration   | 1-2 weeks  |
| Target Completion | 2026-04-26 |

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
