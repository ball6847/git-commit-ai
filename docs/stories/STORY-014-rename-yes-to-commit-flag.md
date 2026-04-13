# STORY-014: Rename `--yes` Flag to `--commit` in Generate Command

**Story ID:** STORY-014
**Priority:** Medium
**Status:** Completed
**Epic:** CLI UX Improvement
**Created:** 2026-04-13

---

## User Story

As a user of git-commit-ai, I want the `--yes` flag renamed to `--commit` so that the flag naming is consistent with `--push` — both flags describe the action being auto-confirmed without prompting.

---

## Context

Currently, the `generate` command has two "auto-accept" flags:

| Flag | Behavior |
|------|----------|
| `--push` | Skip push confirmation prompt, just push |
| `--yes` | Skip message edit prompt, just commit |

`--push` describes the action being auto-confirmed. `--yes` is a generic confirmation flag that doesn't follow the same naming pattern. Renaming to `--commit` creates a consistent pair:

| Flag | Behavior |
|------|----------|
| `--push` | Skip push prompt, just push |
| `--commit` | Skip message prompt, just commit |

Both flags describe which step to auto-accept, making the CLI more intuitive.

---

## Acceptance Criteria

- [ ] `--yes` / `-y` flag removed from `generate` command in `src/cli.ts`
- [ ] `--commit` flag added to `generate` command in `src/cli.ts`
- [ ] `GenerateOptions` interface in `src/cmd/generate.ts` updated: `yes` → `commit`
- [ ] `handleGenerate()` in `src/cmd/generate.ts` uses `options.commit` instead of `options.yes`
- [ ] Output message updated from "Using --yes - accepting generated message" to "Using --commit - auto-accepting commit"
- [ ] Help text updated to reflect new flag name
- [ ] FLAG_ANALYSIS_REPORT.md updated if it exists
- [ ] No references to `--yes` or `-y` remain in source code
- [ ] `deno lint` passes
- [ ] `deno check src/cli.ts` passes

---

## Technical Design

### CLI Flag Change (src/cli.ts)

Replace:
```typescript
.option('-y, --yes', 'Auto-accept generated message without prompting')
```

With:
```typescript
.option('--commit', 'Auto-accept generated message without prompting')
```

No short flag — `--commit` is explicit and self-documenting. A short flag `-c` would conflict with potential future use and is unnecessary for an auto-accept flag.

### Interface Change (src/cmd/generate.ts)

```typescript
export interface GenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  debug?: boolean;
  dryRun?: boolean;
  commit?: boolean;
  push?: boolean;
  message?: string;
}
```

### Logic Change (src/cmd/generate.ts)

Replace:
```typescript
if (options.yes) {
  finalMessage = commitMessage;
  console.log(green('✅ Using --yes - accepting generated message'));
}
```

With:
```typescript
if (options.commit) {
  finalMessage = commitMessage;
  console.log(green('✅ Using --commit - auto-accepting commit'));
}
```

---

## Files to Create

- None

## Files to Modify

- `src/cli.ts` — Replace `--yes`/`-y` flag with `--commit` flag
- `src/cmd/generate.ts` — Update interface and logic from `yes` to `commit`
- `FLAG_ANALYSIS_REPORT.md` — Update flag documentation (if exists)

---

## Dependencies

- None (independent story)

## Breaking Change Note

This is a **breaking change** for users who currently use `--yes` or `-y`. However:
- The tool is at v0.2.0 (pre-1.0), so breaking changes are acceptable
- `--yes` is a non-essential UX flag, not a core feature
- The new name is more intuitive and discoverable
