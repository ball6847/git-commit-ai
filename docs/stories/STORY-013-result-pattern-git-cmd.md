# STORY-013: Result Pattern — git.ts & cmd/*.ts

**Story ID:** STORY-013
**Priority:** Medium
**Status:** Not Started
**Epic:** Epic 2 — TypeScript Result Pattern Refactoring
**Created:** 2026-04-13

---

## User Story

As a developer, I want `git.ts` and all command handlers to use the `Result` pattern so that the entire codebase follows consistent, type-safe error handling with zero try-catch blocks.

---

## Context

This is the final story in the Result pattern refactoring epic. After `models-dev.ts` (STORY-011) and `ai.ts` (STORY-012) are done, `git.ts` and command handlers still use try-catch. This story completes the codebase-wide migration.

---

## Acceptance Criteria

- [ ] `getStagedDiff()` returns `Result<string, Error>` (synchronous)
- [ ] `getChangeSummary()` returns `Result<ChangeSummary, Error>` (synchronous)
- [ ] `isGitRepository()` returns `Result<boolean, Error>` (never throws)
- [ ] No `try-catch` blocks remain in `git.ts`
- [ ] No `try-catch` blocks remain in any file under `src/cmd/`
- [ ] Command handlers handle `Result` types at the top level and present errors to users
- [ ] All tests updated for `Result` return types
- [ ] `deno lint` passes with zero try-catch warnings (or manual grep confirms none)

---

## Technical Design

### git.ts Refactoring

The trickiest part is that `git.ts` uses `Deno.Command.outputSync()` which is synchronous. We need to wrap this with `Result.wrap()`:

```typescript
import { Result } from 'typescript-result';

export function getStagedDiff(): Result<string, Error> {
  const runCommand = (args: string[]) => {
    const command = new Deno.Command('git', { args, stdout: 'piped', stderr: 'piped' });
    return command.outputSync();
  };

  const result = Result.wrap(() => runCommand(['diff', '--cached', '--diff-filter=d']));
  if (!result.ok) {
    return Result.error(new Error(`Git error: ${result.error.message}`));
  }

  const { success, stdout, stderr } = result.value;
  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    return Result.error(new Error(`Git error: ${errorText}`));
  }

  const diff = new TextDecoder().decode(stdout);
  if (!diff.trim()) {
    return Result.error(
      new Error('No staged changes found. Please stage your changes with "git add" first.'),
    );
  }

  return Result.ok(diff);
}
```

### Command Handler Pattern

Command handlers become the "top level" where `Result` errors are presented to users:

```typescript
export async function handleGenerate(options: GenerateOptions) {
  // ... setup code ...

  const diffResult = getStagedDiff();
  if (!diffResult.ok) {
    console.log(red(`❌ ${diffResult.error.message}`));
    Deno.exit(1);
  }
  const diff = diffResult.value;

  const commitResult = await generateCommitMessage(aiConfig, diff, changeSummary, options.message);
  if (!commitResult.ok) {
    console.log(red(`❌ AI Generation Error: ${commitResult.error.message}`));
    Deno.exit(1);
  }
  const commitMessage = commitResult.value;

  // ... rest of flow ...
}
```

### Files to Audit for try-catch Removal

- `src/git.ts` — 3 try-catch blocks to remove
- `src/cmd/generate.ts` — 3 try-catch blocks to remove
- `src/cmd/commit.ts` — try-catch blocks to remove
- `src/cmd/status.ts` — may have try-catch

---

## Files to Create

- None

## Files to Modify

- `src/git.ts` — Refactor all functions to Result pattern
- `src/cmd/generate.ts` — Result-based flow, remove all try-catch
- `src/cmd/commit.ts` — Result-based flow, remove all try-catch
- `src/cmd/status.ts` — Handle Result from git functions
- `tests/main_test.ts` — Update all test assertions for Result

---

## Dependencies

- STORY-011 (models-dev.ts Result refactor)
- STORY-012 (ai.ts Result refactor)
- Must be done last since it depends on all other modules returning Result types
