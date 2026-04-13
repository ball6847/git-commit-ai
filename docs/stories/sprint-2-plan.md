# Sprint 2 Plan: git-commit-ai

**Sprint:** 2
**Project:** git-commit-ai
**Level:** 0 (Single atomic change)
**Created:** 2026-04-13
**Status:** Planning

---

## Sprint Goal

Migrate application data to XDG-compliant directories, add configuration file support for persistent settings (model, temperature, thinking effort, custom providers), and refactor the entire codebase to use the `typescript-result` pattern for type-safe error handling, eliminating all try-catch blocks.

---

## Epic 1: Configuration File Support

Migrate to XDG Base Directory layout, enable global config at `~/.config/git-commit-ai/config.json`, and support custom provider registration.

**Priority:** High

### Story 2.1: XDG Base Directory Paths & Cache Migration

**Story ID:** STORY-008
**Priority:** High
**Status:** Not Started

**User Story:**
As a user of git-commit-ai, I want application data stored in standard XDG-compliant directories so that my system stays organized and follows platform conventions.

**Acceptance Criteria:**

- [ ] New `src/paths.ts` module provides all application directory paths
- [ ] Config dir: `$XDG_CONFIG_HOME/git-commit-ai/` or `~/.config/git-commit-ai/`
- [ ] Cache dir: `$XDG_CACHE_HOME/git-commit-ai/` or `~/.cache/git-commit-ai/`
- [ ] Cache file: `<cache_dir>/models.json` (was `~/.git-commit-ai/models-cache.json`)
- [ ] Config file: `<config_dir>/config.json`
- [ ] One-time migration: if old `~/.git-commit-ai/models-cache.json` exists and new cache doesn't, move it
- [ ] Old directory `~/.git-commit-ai/` removed after successful migration (if empty)
- [ ] All hardcoded path strings removed from `src/models-dev.ts`

**Technical Notes:**

- Create `src/paths.ts` with `getConfigDir()`, `getCacheDir()`, `getConfigFile()`, `getModelsCacheFile()`, `getLegacyCacheDir()`, `getLegacyCacheFile()`
- Respect `$XDG_CONFIG_HOME` and `$XDG_CACHE_HOME` environment variables
- Use `@std/path` `join()` for path construction
- `migrateLegacyCache()` runs on startup, moves old cache to new location
- Update `src/models-dev.ts` to use `paths.ts` instead of hardcoded `CACHE_DIR`/`CACHE_FILE`

**Files to Create:**

- `src/paths.ts`

**Files to Modify:**

- `src/models-dev.ts` (replace hardcoded paths with paths.ts imports)
- `deno.json` (add `@std/path` import)

---

### Story 2.2: Config File Loading & Merging

**Story ID:** STORY-009
**Priority:** High
**Status:** Not Started

**User Story:**
As a user of git-commit-ai, I want to configure default settings in a global config file so that I don't have to pass CLI flags or set env vars every time I run the tool.

**Acceptance Criteria:**

- [ ] Load config from `~/.config/git-commit-ai/config.json` (using `paths.ts`)
- [ ] Respect `$XDG_CONFIG_HOME` override for config directory
- [ ] Merge priority: CLI flags > env vars > config file > defaults
- [ ] Support `model`, `temperature`, `maxTokens`, `thinkingEffort` in config
- [ ] Support `providers` section for custom provider definitions
- [ ] Clear error message if config file has invalid JSON
- [ ] Config file is optional — tool works without it (current behavior preserved)

**Technical Notes:**

- Create `src/config.ts` module with `loadConfig()` and `mergeConfig()` functions
- Use `Result` from `typescript-result` for all error handling (no try-catch)
- Config schema:

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "temperature": 0.3,
  "maxTokens": 200,
  "thinkingEffort": "medium",
  "providers": {
    "my-custom-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "api": "https://api.my-provider.com/v1",
      "env": ["MY_PROVIDER_API_KEY"]
    }
  }
}
```

- Single global config location (no walk-up directory search)
- Use `Result.wrap(Deno.readTextFile)` for file reads
- Update `src/types.ts` with `ConfigFile` and `ResolvedConfig` interfaces

**Files to Create:**

- `src/config.ts`

**Files to Modify:**

- `src/types.ts` (add ConfigFile, CustomProviderConfig, CustomModelConfig, ResolvedConfig)
- `src/cli.ts` (load config at startup, pass `ResolvedConfig` into commands)
- `src/cmd/generate.ts` (use merged config instead of only env/flags)
- `src/cmd/commit.ts` (use merged config)
- `deno.json` (add `typescript-result` import)

---

### Story 2.3: Custom Provider & Extension Registration

**Story ID:** STORY-010
**Priority:** High
**Status:** Not Started

**User Story:**
As a user of git-commit-ai, I want to define custom providers in my config file so that I can use new AI models that aren't yet listed in models.dev, without waiting for an upstream update.

**Acceptance Criteria:**

- [ ] Custom providers in config file are resolved alongside models.dev providers
- [ ] Custom providers can specify `npm` (bundled SDK), `api` (openai-compatible URL), and `env` (env var names for API key)
- [ ] Custom providers appear in `model` command output with a custom marker (e.g., `[custom]`)
- [ ] Custom providers work with `--model custom-provider/model-id`
- [ ] Provider extension: can add models to an existing models.dev provider via `extend: true`
- [ ] Conflicting provider IDs: config definition merges/extends models.dev, with a console warning for full overrides

**Technical Notes:**

- Extend `src/models-dev.ts` to accept custom providers from config
- Add `mergeCustomProviders(data, customProviders)` function
- In `BUNDLED_SDK_FACTORIES`, support custom provider resolution path
- Add `extend` field in provider config to add models to existing provider:

```json
{
  "providers": {
    "anthropic": {
      "extend": true,
      "models": {
        "my-fine-tuned-model": {
          "name": "My Fine-Tuned Model",
          "reasoning": true,
          "tool_call": true
        }
      }
    }
  }
}
```

- When `extend: true`, models are merged into the existing models.dev provider
- When `extend` is absent or `false`, the provider is treated as a completely new entry

**Files to Create:**

- None

**Files to Modify:**

- `src/models-dev.ts` (add custom provider merging and extension logic)
- `src/config.ts` (export custom providers from config)
- `src/cmd/model.ts` (display custom providers with marker, show extended models)
- `src/ai.ts` (resolve custom providers in model lookup)
- `src/types.ts` (add CustomProviderConfig, ProviderExtension types)

---

## Epic 2: TypeScript Result Pattern Refactoring

Refactor all error handling across the codebase to use `typescript-result` with `Result.wrap()`, eliminating all try-catch blocks and enforcing the project's Result pattern guide.

**Priority:** Medium

### Story 2.4: Result Pattern — models-dev.ts

**Story ID:** STORY-011
**Priority:** Medium
**Status:** Not Started

**User Story:**
As a developer, I want `models-dev.ts` to use the `Result` pattern throughout so that all errors are handled in a type-safe manner without any try-catch blocks.

**Acceptance Criteria:**

- [ ] `fetchFromApi()` returns `Promise<Result<ModelsDevResponse, Error>>`
- [ ] `getModelsDevData()` returns `Promise<Result<ModelsDevResponse, Error>>`
- [ ] `refreshModelsDevCache()` returns `Promise<Result<ModelsDevResponse, Error>>`
- [ ] `saveCache()` uses `Result.wrap()` for file operations
- [ ] `loadCache()` uses `Result.wrap()` for file operations
- [ ] `clearModelsDevCache()` uses `Result.wrap()` for file operations
- [ ] No `try-catch` blocks remain in `models-dev.ts`
- [ ] All callers updated to handle `Result` return types
- [ ] Tests updated for `Result` return types (check `.ok` property)

**Technical Notes:**

- Import `Result` from `npm:typescript-result`
- Replace all `try { ... } catch { ... }` with `Result.wrap()` pattern
- Update function signatures to return `Result<T, Error>` or `Promise<Result<T, Error>>`
- Key functions to refactor:
  - `loadCache()` — wrap `Deno.readTextFile`
  - `saveCache()` — wrap `Deno.mkdir`, `Deno.writeTextFile`
  - `fetchFromApi()` — wrap `fetch` and `response.json()`
  - `getModelsDevData()` — chain Results instead of try-catch
  - `refreshModelsDevCache()` — same pattern
  - `clearModelsDevCache()` — wrap `Deno.remove`
- Cache paths use `getCacheDir()` / `getModelsCacheFile()` from `src/paths.ts` (STORY-008)
- Update callers in `src/ai.ts` and `src/cmd/model.ts` to check `.ok` property

**Files to Create:**

- None

**Files to Modify:**

- `src/models-dev.ts` (refactor all functions to Result pattern)
- `src/ai.ts` (handle Result from models-dev functions)
- `src/cmd/model.ts` (handle Result from models-dev functions)
- `tests/main_test.ts` (update tests for Result pattern)

---

### Story 2.5: Result Pattern — ai.ts

**Story ID:** STORY-012
**Priority:** Medium
**Status:** Not Started

**User Story:**
As a developer, I want `ai.ts` to use the `Result` pattern throughout so that AI generation errors are handled in a type-safe manner and callers can decide how to present errors.

**Acceptance Criteria:**

- [ ] `generateCommitMessage()` returns `Promise<Result<string, Error>>`
- [ ] `getLanguageModel()` returns `Promise<Result<LanguageModel, Error>>`
- [ ] No `try-catch` blocks remain in `ai.ts`
- [ ] All `throw new Error()` replaced with `Result.error()`
- [ ] `generateText()` call wrapped with `Result.wrap()`
- [ ] Callers in `cmd/generate.ts` and `cmd/commit.ts` updated to handle Result

**Technical Notes:**

- Replace `throw` with `Result.error()` for expected error cases
- Wrap `generateText()` from AI SDK with `Result.wrap()` since it may throw
- `getLanguageModel()` — instead of throwing, return `Result.error()` for "not found" and "no API key"
- `generateCommitMessage()` — remove try-catch, return Result chain
- Update `cmd/generate.ts` and `cmd/commit.ts` to check `.ok` on Result before proceeding

**Files to Create:**

- None

**Files to Modify:**

- `src/ai.ts` (refactor to Result pattern)
- `src/cmd/generate.ts` (handle Result from generateCommitMessage)
- `src/cmd/commit.ts` (handle Result from generateCommitMessage)
- `tests/main_test.ts` (update test assertions)

---

### Story 2.6: Result Pattern — git.ts & cmd/*.ts

**Story ID:** STORY-013
**Priority:** Medium
**Status:** Not Started

**User Story:**
As a developer, I want `git.ts` and all command handlers to use the `Result` pattern so that the entire codebase follows consistent, type-safe error handling with zero try-catch blocks.

**Acceptance Criteria:**

- [ ] `getStagedDiff()` returns `Result<string, Error>`
- [ ] `getChangeSummary()` returns `Result<ChangeSummary, Error>`
- [ ] `isGitRepository()` returns `Result<boolean, Error>` (never throws)
- [ ] No `try-catch` blocks remain in `git.ts`
- [ ] No `try-catch` blocks remain in any file under `src/cmd/`
- [ ] Command handlers handle `Result` types at the top level and present errors to users
- [ ] All tests updated for `Result` return types

**Technical Notes:**

- `git.ts` functions use `Deno.Command.outputSync()` — wrap with `Result.wrap()` pattern
- Since `outputSync()` is synchronous, create a wrapper: `const runGitCmd = Result.wrap(function(...))` or use a helper
- Note: `Deno.Command.outputSync()` doesn't return a Promise, so use `Result.wrap()` on a function that calls it
- For command handlers (`cmd/generate.ts`, `cmd/commit.ts`, `cmd/status.ts`):
  - Replace top-level try-catch with Result-based flow
  - Present errors to users based on `result.ok` / `result.error`
  - `Deno.exit(1)` remains for fatal errors, but only after checking Result
- `cmd/version.ts` likely doesn't need changes (simple version output)

**Files to Create:**

- None

**Files to Modify:**

- `src/git.ts` (refactor all functions to Result pattern)
- `src/cmd/generate.ts` (Result-based flow, remove try-catch)
- `src/cmd/commit.ts` (Result-based flow, remove try-catch)
- `src/cmd/status.ts` (handle Result from git functions)
- `tests/main_test.ts` (update all test assertions for Result)

---

## XDG Directory Layout

```
~/.config/git-commit-ai/
├── config.json                  # User configuration (STORY-009)
└── cache/                       # → moved to ~/.cache/git-commit-ai/
    └── models.json              # models.dev API cache (STORY-008)
```

Actual layout (config and cache are separate per XDG spec):

```
~/.config/git-commit-ai/
└── config.json                  # User configuration

~/.cache/git-commit-ai/
└── models.json                  # models.dev API cache
```

With XDG env overrides:

```
$XDG_CONFIG_HOME/git-commit-ai/config.json
$XDG_CACHE_HOME/git-commit-ai/models.json
```

Migration from old layout:

```
~/.git-commit-ai/models-cache.json → ~/.cache/git-commit-ai/models.json
~/.git-commit-ai/ (removed if empty after migration)
```

---

## Sprint Metrics

| Metric            | Value            |
| ----------------- | ---------------- |
| Total Stories     | 6                |
| Story Points      | 18 (3+5+5+2+2+1) |
| Sprint Duration   | 2-3 weeks        |
| Target Completion | 2026-05-04       |

## Dependencies

- `typescript-result` npm package (to add to `deno.json`)
- `@std/path` for path joining in `src/paths.ts`
- XDG Base Directory specification for path conventions

## Story Dependency Graph

```
STORY-008 (XDG paths + cache migration)
  ├── STORY-009 (Config file loading) — depends on 008
  │   └── STORY-010 (Custom providers) — depends on 009
  └── STORY-011 (Result: models-dev.ts) — depends on 008
      └── STORY-012 (Result: ai.ts) — depends on 011
          └── STORY-013 (Result: git.ts + cmds) — depends on 011, 012
```

## Risks

| Risk                                      | Impact | Mitigation                                                     |
| ----------------------------------------- | ------ | -------------------------------------------------------------- |
| Legacy cache migration fails              | Medium | Graceful fallback: re-fetch from models.dev if migration fails |
| XDG env vars set to unexpected values     | Low    | Validate paths, fall back to defaults if XDG vars are empty    |
| Config file schema changes needed         | Medium | Start with minimal schema, extend iteratively                  |
| Result refactor breaks existing callers   | Medium | Refactor module-by-module, run tests after each                |
| Custom provider SDK not bundled           | Low    | Use `@ai-sdk/openai-compatible` as universal fallback          |
| Synchronous Deno.Command wrapping awkward | Low    | Use inline `Result.wrap()` pattern with wrapper functions      |

## Key Design Decisions

1. **XDG Base Directory compliance** — Config in `~/.config/git-commit-ai/`, cache in `~/.cache/git-commit-ai/`
2. **XDG env var support** — Respect `$XDG_CONFIG_HOME` and `$XDG_CACHE_HOME` if set
3. **Global config only** — `~/.config/git-commit-ai/config.json` (no per-project walk-up)
4. **JSON config format** — Simple, widely supported, easy to validate
5. **Provider extension model** — `extend: true` merges models into existing providers; `extend: false/absent` creates new provider
6. **Result pattern everywhere** — No try-catch blocks, all errors are `Result.error()`, callers check `.ok`
7. **Module-by-module refactor** — Result pattern applied incrementally (models-dev → ai → git + cmds)
8. **Thinking effort** — New concept mapped to `providerOptions` in AI SDK, allows controlling reasoning depth
9. **Cache migration** — One-time automatic move from `~/.git-commit-ai/` to `~/.cache/git-commit-ai/`

## Definition of Done

- [ ] All stories completed
- [ ] Tests passing (`deno test --allow-run --allow-env --allow-read`)
- [ ] Lint passing (`deno lint`)
- [ ] Type check passing (`deno check src/cli.ts`)
- [ ] No try-catch blocks anywhere in `src/`
- [ ] All functions returning `Result<T, Error>` or `Promise<Result<T, Error>>`
- [ ] Application data in XDG-compliant directories
- [ ] Legacy cache migrated (or gracefully handled)
- [ ] Config file loading and merging works (with and without config file)
- [ ] Custom providers work alongside models.dev providers
- [ ] Existing functionality preserved (backward compatible)
- [ ] `model` command shows custom providers
- [ ] `generate --model custom/model-id` works with config-defined providers
