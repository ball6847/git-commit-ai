# Sprint 3 Plan: git-commit-ai

**Sprint:** 3
**Project:** git-commit-ai
**Level:** 0 (Single atomic change)
**Created:** 2026-04-14
**Status:** In Progress

---

## Sprint Goal

Simplify the CLI by removing the redundant `commit` command and consolidating its behavior into `generate` via smart auto-staging. Add integration tests to verify config file loading and custom provider merging work correctly in isolation.

---

## Epic 1: CLI Simplification

**Epic ID:** EPIC-006
**Priority:** High

Remove the `commit` command (which duplicates `generate --commit`) and make `generate` smart about staging: auto-stage all changes when nothing is staged, and respect explicitly staged files when present.

### Stories

| Story     | Title                                                  | File                                                                                     |
| --------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| STORY-023 | Remove commit command and add --stage flag to generate | [STORY-023-remove-commit-add-stage-flag.md](./STORY-023-remove-commit-add-stage-flag.md) |

---

## Epic 2: Config Integration Tests

**Epic ID:** EPIC-007
**Priority:** Medium

Add isolated integration tests for config file loading and custom provider merging to ensure the config system behaves correctly across edge cases.

### Stories

| Story     | Title                                                                 | File                                                                                                             |
| --------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| STORY-024 | Integration tests for config file loading and custom provider merging | [STORY-024-integration-tests-config-custom-provider.md](./STORY-024-integration-tests-config-custom-provider.md) |

---

## Sprint Metrics

| Metric            | Value      |
| ----------------- | ---------- |
| Total Stories     | 2          |
| Sprint Duration   | 1 week     |
| Target Completion | 2026-05-11 |

---

## Dependencies

- STORY-008, STORY-009 (XDG paths and config loading already implemented)
- STORY-015, STORY-016 (DI refactor and testing framework already implemented)

---

## Risks

| Risk                             | Impact | Mitigation                                |
| -------------------------------- | ------ | ----------------------------------------- |
| Users depend on `commit` command | Low    | `generate --commit` is equivalent         |
| Integration tests touch real FS  | Low    | Use temp directories in tests             |

---

## Definition of Done

- [ ] STORY-023 implemented and reviewed
- [ ] STORY-024 implemented and reviewed
- [ ] All tests pass: `deno task test`
- [ ] Lint passes: `deno task lint`
- [ ] Documentation updated (`README.md`, `AGENTS.md`)
