# Sprint 2 Plan: git-commit-ai

**Sprint:** 2
**Project:** git-commit-ai
**Level:** 0 (Single atomic change)
**Created:** 2026-04-13
**Status:** In Progress

---

## Sprint Goal

Migrate application data to XDG-compliant directories, add configuration file support for persistent settings (model, temperature, thinking effort, custom providers), and refactor the entire codebase to use the `typescript-result` pattern for type-safe error handling, eliminating all try-catch blocks.

---

## Epic 1: Configuration File Support

**Epic ID:** EPIC-002
**Priority:** High

Migrate to XDG Base Directory layout, enable global config at `~/.config/git-commit-ai/config.json`, and support custom provider registration.

### Stories

| Story     | Title                                      | File                                                                               |
| --------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| STORY-008 | XDG Base Directory Paths & Cache Migration | [STORY-008-xdg-paths-cache-migration.md](./STORY-008-xdg-paths-cache-migration.md) |
| STORY-009 | Config File Loading & Merging              | [STORY-009-config-file-support.md](./STORY-009-config-file-support.md)             |
| STORY-010 | Custom Provider & Extension Registration   | [STORY-010-custom-provider-extension.md](./STORY-010-custom-provider-extension.md) |

---

## Epic 2: Result Pattern Refactoring

**Epic ID:** EPIC-003
**Priority:** High

Eliminate all try-catch blocks and migrate to `typescript-result` for type-safe error handling across the codebase.

### Stories

| Story     | Title                              | File                                                                               |
| --------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| STORY-011 | Result Pattern — models-dev.ts     | [STORY-011-result-pattern-models-dev.md](./STORY-011-result-pattern-models-dev.md) |
| STORY-012 | Result Pattern — ai.ts             | [STORY-012-result-pattern-ai.md](./STORY-012-result-pattern-ai.md)                 |
| STORY-013 | Result Pattern — git.ts & cmd/*.ts | [STORY-013-result-pattern-git-cmd.md](./STORY-013-result-pattern-git-cmd.md)       |

---

## Epic 3: CLI Polish

**Epic ID:** EPIC-004
**Priority:** Medium

Refine CLI flags and behavior for better usability and predictability.

### Stories

| Story     | Title                                                    | File                                                                               |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| STORY-014 | Rename --yes flag to --commit                            | [STORY-014-rename-yes-to-commit-flag.md](./STORY-014-rename-yes-to-commit-flag.md) |
| STORY-017 | Ensure --dry-run takes priority over --commit and --push | [STORY-017-dry-run-priority.md](./STORY-017-dry-run-priority.md)                   |
| STORY-018 | Add --no-push flag and GIT_COMMIT_AI_NO_PUSH env var     | [STORY-018-no-push-flag.md](./STORY-018-no-push-flag.md)                           |

---

## Epic 4: Testing Infrastructure

**Epic ID:** EPIC-005
**Priority:** High

Add dependency injection for testability and build a comprehensive integration testing framework using ts-mockito.

### Stories

| Story     | Title                                         | File                                                                                               |
| --------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| STORY-015 | Dependency Injection Refactor for Testability | [STORY-015-dependency-injection-refactor.md](./STORY-015-dependency-injection-refactor.md)         |
| STORY-016 | Integration Testing Framework with ts-mockito | [STORY-016-integration-testing-ts-mockito.md](./STORY-016-integration-testing-ts-mockito.md)       |
| STORY-019 | Integration Tests for commit Command          | [STORY-019-integration-tests-commit-command.md](./STORY-019-integration-tests-commit-command.md)   |
| STORY-020 | Integration Tests for model Command           | [STORY-020-integration-tests-model-command.md](./STORY-020-integration-tests-model-command.md)     |
| STORY-021 | Integration Tests for status Command          | [STORY-021-integration-tests-status-command.md](./STORY-021-integration-tests-status-command.md)   |
| STORY-022 | Integration Tests for version Command         | [STORY-022-integration-tests-version-command.md](./STORY-022-integration-tests-version-command.md) |

---

## Sprint Metrics

| Metric            | Value      |
| ----------------- | ---------- |
| Total Stories     | 15         |
| Sprint Duration   | 2-3 weeks  |
| Target Completion | 2026-05-04 |

---

## Story Dependency Graph

```
STORY-008 (XDG paths + cache migration)
  ├── STORY-009 (Config file loading) — depends on 008
  │   └── STORY-010 (Custom providers) — depends on 009
  └── STORY-011 (Result: models-dev.ts) — depends on 008
      └── STORY-012 (Result: ai.ts) — depends on 011
          └── STORY-013 (Result: git.ts + cmds) — depends on 011, 012

STORY-014 (Rename --yes to --commit) — independent
  └── STORY-017 (dry-run priority) — depends on 014
    └── STORY-018 (--no-push flag) — depends on 017

STORY-015 (Dependency Injection Refactor) — independent
  └── STORY-016 (Integration Testing Framework) — depends on 015
    └── STORY-019..022 (Command integration tests) — depend on 016
```

---

## Dependencies

- `typescript-result` npm package
- `@std/path` for path joining in `src/paths.ts`
- XDG Base Directory specification for path conventions

---

## Risks

| Risk                                    | Impact | Mitigation                                                     |
| --------------------------------------- | ------ | -------------------------------------------------------------- |
| Legacy cache migration fails            | Medium | Graceful fallback: re-fetch from models.dev if migration fails |
| XDG env vars set to unexpected values   | Low    | Validate paths, fall back to defaults if XDG vars are empty    |
| Config file schema changes needed       | Medium | Start with minimal schema, extend iteratively                  |
| Result refactor breaks existing callers | Medium | Refactor module-by-module, run tests after each                |
| Custom provider SDK not bundled         | Low    | Use `@ai-sdk/openai-compatible` as universal fallback          |

---

## Key Design Decisions

1. **XDG Base Directory compliance** — Config in `~/.config/git-commit-ai/`, cache in `~/.cache/git-commit-ai/`
2. **XDG env var support** — Respect `$XDG_CONFIG_HOME` and `$XDG_CACHE_HOME` if set
3. **Global config only** — `~/.config/git-commit-ai/config.json` (no per-project walk-up)
4. **JSON config format** — Simple, widely supported, easy to validate
5. **Provider extension model** — `extend: true` merges models into existing providers
6. **Result pattern everywhere** — No try-catch blocks, all errors are `Result.error()`
7. **Module-by-module refactor** — Result pattern applied incrementally
8. **Cache migration** — One-time automatic move from `~/.git-commit-ai/` to `~/.cache/git-commit-ai/`

---

## Definition of Done

- [ ] All stories completed
- [ ] Tests passing (`deno test --allow-run --allow-env --allow-read`)
- [ ] Lint passing (`deno lint`)
- [ ] Type check passing (`deno check src/cli.ts`)
- [ ] No try-catch blocks anywhere in `src/`
- [ ] Application data in XDG-compliant directories
- [ ] Legacy cache migrated (or gracefully handled)
- [ ] Config file loading and merging works
- [ ] Custom providers work alongside models.dev providers
- [ ] Existing functionality preserved (backward compatible)
