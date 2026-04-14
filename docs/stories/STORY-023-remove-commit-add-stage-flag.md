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

As a user of git-commit-ai, I want the `generate` command to automatically handle staging so that I don't need to remember a separate `commit` command or manually stage files.

## Context

The `commit` command was originally a "quick commit" shortcut that automatically staged all changes, generated a message, and committed. This functionality overlaps with `generate --commit`. To simplify the CLI surface, we will remove the `commit` command entirely and make `generate` smart about staging:

- If no files are staged, `generate` automatically stages all changes before generating the commit message.
- If files are already staged, `generate` respects the user's selection and only considers those staged files.

The old workflow:

```bash
git-commit-ai commit --model gpt-4o
```

Becomes:

```bash
git-commit-ai generate --commit --model gpt-4o
```

## Acceptance Criteria

- [x] `commit` command removed from `src/cli.ts`
- [x] `src/cmd/commit.ts` file removed
- [x] `handleGenerate` automatically stages all changes when no files are staged
- [x] `handleGenerate` respects existing staged files and does not auto-stage when staged files exist
- [x] `generate --commit` on unstaged changes replicates the old `commit` command behavior
- [x] `generate` exits gracefully with "No changes to commit" when there are no changes at all
- [x] `tests/integration/commit-tests/` directory removed
- [x] Smart staging tests added to `generate-tests/`
- [x] `AGENTS.md` updated to remove references to `commit` command
- [x] `README.md` updated to remove references to `commit` command and document smart staging

## Technical Design

### Current `commit` command flow

1. Stage all changes (unless `--staged`)
2. Get change summary and diff
3. Generate commit message
4. Commit changes

### New `generate --commit` flow

1. Try to get change summary and diff
2. If no staged changes are found, run `git add .` and retry
3. If still no changes after staging, exit gracefully with "No changes to commit"
4. Generate commit message
5. If `--commit` is passed, commit without prompting
6. Handle push logic as today

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

Remove commit command block entirely (no `--stage` flag needed).

### `src/cmd/generate.ts` Changes

Add `stageAllChanges` dependency (can be a simple `git add .` wrapper):

```typescript
export interface GenerateDependencies {
  // ... existing deps
  stageAllChanges?: (cwd?: string) => Promise<boolean>;
}
```

When catching "No staged changes" error after reading diff:

```typescript
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes('No staged changes')
  ) {
    logger.log(cyan('📝 No staged changes found. Staging all changes...'));
    const success = await stageAllChanges(cwd);
    if (!success) {
      logger.log(red('❌ Failed to stage changes'));
      exit(1);
    }
    // Retry getting summary and diff
    try {
      changeSummary = getSummary(cwd);
      if (!changeSummary.allDeletions) {
        diff = getDiff(cwd);
      }
    } catch (retryError) {
      if (
        retryError instanceof Error &&
        retryError.message.includes('No staged changes')
      ) {
        logger.log(cyan('No changes to commit.'));
        exit(0);
      }
      logger.log(
        red(`❌ ${retryError instanceof Error ? retryError.message : 'Unknown error'}`),
      );
      exit(1);
    }
  } else {
    logger.log(red(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`));
    exit(1);
  }
}
```

## Files to Remove

- `src/cmd/commit.ts`
- `tests/integration/commit-tests/` (entire directory)

## Files to Modify

- `src/cli.ts` — Remove commit command
- `src/cmd/generate.ts` — Add `stageAllChanges` dependency and smart auto-staging logic
- `tests/integration/generate-tests/` — Add smart staging tests
- `AGENTS.md` — Remove commit command references
- `README.md` — Document smart staging, remove `commit` command docs

## Story Points

3

## Dependencies

- None
