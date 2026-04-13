# STORY-018: Add `--no-push` Flag & `GIT_COMMIT_AI_NO_PUSH` Environment Variable

**Story ID:** STORY-018
**Priority:** Medium
**Status:** Completed
**Epic:** CLI UX Improvement
**Created:** 2026-04-13
**Completed:** 2026-04-14

---

## User Story

As a user of git-commit-ai, I want a `--no-push` flag and `GIT_COMMIT_AI_NO_PUSH` environment variable so that I can skip the push step entirely without being prompted, unless I explicitly override with `--push`.

---

## Context

Currently, after committing, the `generate` command always either:

- Shows a push confirmation prompt (default)
- Auto-pushes with `--push`

There is no way to **skip push entirely** without answering "no" at the prompt each time. This is inconvenient for:

- Users who never push from the generate command
- CI/CD pipelines that want to commit but handle push separately
- Users who want to review before pushing later

### Priority Order

```
--push (CLI flag) > --no-push (CLI flag) > GIT_COMMIT_AI_NO_PUSH (env var) > default (show prompt)
```

| `--push` | `--no-push` | `GIT_COMMIT_AI_NO_PUSH` | Behavior                           |
| -------- | ----------- | ----------------------- | ---------------------------------- |
| -        | -           | -                       | Show push prompt (current default) |
| yes      | -           | any                     | Auto-push (override everything)    |
| -        | yes         | any                     | Skip push entirely                 |
| -        | -           | `true`                  | Skip push entirely                 |
| yes      | yes         | any                     | Auto-push (`--push` always wins)   |

---

## Acceptance Criteria

- [x] `--no-push` flag added to `generate` command
- [x] `GIT_COMMIT_AI_NO_PUSH=true` env var skips push prompt
- [x] `--push` flag overrides `--no-push` and `GIT_COMMIT_AI_NO_PUSH`
- [x] When push is skipped via `--no-push` or env var, output: `"Push skipped (--no-push)."`
- [x] `--no-push` with `--push` shows warning: `"--push overrides --no-push."`
- [x] `GenerateOptions` interface updated with `noPush?: boolean`
- [x] `deno lint` and `deno check` pass

## Implementation Notes

### CLI Flag (src/cli.ts line 85)

```typescript
.option('--no-push', 'Skip push step entirely (overridden by --push)')
```

### GenerateOptions Interface (src/cmd/generate.ts lines 9-19)

```typescript
export interface GenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  debug?: boolean;
  dryRun?: boolean;
  commit?: boolean;
  push?: boolean;
  noPush?: boolean;
  message?: string;
}
```

### Push Logic (src/cmd/generate.ts lines 160-170)

```typescript
// Push decision: --push overrides --no-push and env var
if (options.push) {
  if (options.noPush) {
    console.log(yellow('⚠️  --push overrides --no-push.'));
  }
  await pushChanges(true);
} else if (options.noPush || Deno.env.get('GIT_COMMIT_AI_NO_PUSH') === 'true') {
  console.log(blue('📋 Push skipped (--no-push).'));
} else {
  await pushChanges(false);
}
```

---

## Technical Design

### CLI Flag (src/cli.ts)

```typescript
.option('--no-push', 'Skip push step entirely (overridden by --push)')
```

No short flag - `--no-push` is explicit and self-documenting.

### Interface (src/cmd/generate.ts)

```typescript
export interface GenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  debug?: boolean;
  dryRun?: boolean;
  commit?: boolean;
  push?: boolean;
  noPush?: boolean;
  message?: string;
}
```

### Logic (src/cmd/generate.ts)

```typescript
// Push decision: --push overrides --no-push and env var
if (options.push) {
  if (options.noPush) {
    console.log(yellow('⚠️  --push overrides --no-push.'));
  }
  await pushChanges(true);
} else if (options.noPush || Deno.env.get('GIT_COMMIT_AI_NO_PUSH') === 'true') {
  console.log(blue('📋 Push skipped (--no-push).'));
} else {
  await pushChanges(false);
}
```

### Environment Variable

- `GIT_COMMIT_AI_NO_PUSH=true` - skip push prompt entirely
- Any other value (or unset) - show push prompt (current default)

---

## Files to Create

- None

## Files to Modify

- `src/cli.ts` - Add `--no-push` flag
- `src/cmd/generate.ts` - Add `noPush` to interface, implement push skip logic

---

## Dependencies

- STORY-017 (dry-run priority) - should be completed first so push decision logic is clean
