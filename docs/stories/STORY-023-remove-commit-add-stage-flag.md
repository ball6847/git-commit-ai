---
story_id: STORY-023
title: Remove commit command and add --stage flag to generate
created_at: 2026-04-14
status: Not Started
sprint: Sprint 3
epic: Epic 1 - CLI Simplification
---

# Story 3.1: Remove commit command and add --stage flag to generate

**Story ID:** STORY-023
**Priority:** High
**Status:** Not Started
**Sprint:** Sprint 3
**Epic:** Epic 1 — CLI Simplification

## User Story

As a user of git-commit-ai, I want a single `generate` command that can optionally stage all my changes so that I don't need to remember a separate `commit` command.

## Context

The `commit` command was originally a "quick commit" shortcut that automatically staged all changes, generated a message, and committed. This functionality overlaps with `generate --commit`. To simplify the CLI surface, we will remove the `commit` command entirely and add a `--stage` flag to `generate` so users can opt into staging unstaged changes before generation.

The old workflow:

```bash
git-commit-ai commit --model gpt-4o
```

Becomes:

```bash
git-commit-ai generate --stage --commit --model gpt-4o
```

## Acceptance Criteria

- [ ] `commit` command removed from `src/cli.ts`
- [ ] `src/cmd/commit.ts` file removed
- [ ] `--stage` flag added to `generate` command in `src/cli.ts`
- [ ] `handleGenerate` stages all changes before reading diff when `--stage` is passed
- [ ] `generate --stage --commit` produces the same behavior as the old `commit` command
- [ ] Existing `generate` behavior without `--stage` is unchanged (still requires pre-staged changes)
- [ ] `tests/integration/commit-tests/` directory removed
- [ ] Any useful commit-test logic migrated to `generate-tests/` if not already covered
- [ ] `AGENTS.md` updated to remove references to `commit` command
- [ ] `README.md` updated to remove references to `commit` command and document `--stage`

## Technical Design

### Current `commit` command flow

1. Stage all changes (unless `--staged`)
2. Get change summary and diff
3. Generate commit message
4. Commit changes

### New `generate --stage --commit` flow

1. If `--stage` is passed, run `git add .` before reading diff
2. Get change summary and diff
3. Generate commit message
4. If `--commit` is passed, commit without prompting
5. Handle push logic as today

### `src/cli.ts` Changes

Remove:

```typescript
// Add commit command
cli
  .command('commit', 'Generate and commit changes with AI')
  .alias('c')
  .option('--model <model:string>', 'AI model to use')
  .option('-p, --provider <provider:string>', 'AI provider to use')
  .option('--staged', 'Only commit staged changes (default: stage all)')
  .option('-d, --debug', 'Enable debug output')
  .action((opts) => handleCommit(opts));
```

Add to generate command:

```typescript
.option('--stage', 'Stage all changes before generating commit message')
```

### `src/cmd/generate.ts` Changes

Add `stageAllChanges` dependency (can be a simple `git add .` wrapper):

```typescript
export interface GenerateDependencies {
  // ... existing deps
  stageAllChanges?: (cwd?: string) => Promise<boolean>;
}
```

Before reading diff:

```typescript
if (options.stageAll) {
  logger.log(cyan('📝 Staging all changes...'));
  const success = await stageAllChanges(cwd);
  if (!success) {
    logger.log(red('❌ Failed to stage changes'));
    exit(1);
  }
}
```

## Files to Remove

- `src/cmd/commit.ts`
- `tests/integration/commit-tests/` (entire directory)

## Files to Modify

- `src/cli.ts` — Remove commit command, add `--stage` to generate
- `src/cmd/generate.ts` — Add `stageAllChanges` dependency and stage logic
- `tests/integration/generate-tests/` — Add `--stage` tests if needed
- `AGENTS.md` — Remove commit command references
- `README.md` — Document `--stage`, remove `commit` command docs

## Story Points

3

## Dependencies

- None
