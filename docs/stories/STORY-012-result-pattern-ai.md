---
status: In Progress
---

# STORY-012: Result Pattern — ai.ts

**Story ID:** STORY-012
**Priority:** Medium
**Status:** Not Started
**Epic:** Epic 2 — TypeScript Result Pattern Refactoring
**Created:** 2026-04-13

---

## User Story

As a developer, I want `ai.ts` to use the `Result` pattern throughout so that AI generation errors are handled in a type-safe manner and callers can decide how to present errors.

---

## Context

Currently, `ai.ts` uses `throw new Error()` for error cases and try-catch in `generateCommitMessage()`. Per the project's `TYPESCRIPT_RESULT_GUIDE.md`, all error handling must use `Result` from `typescript-result` with no try-catch blocks.

---

## Acceptance Criteria

- [ ] `generateCommitMessage()` returns `Promise<Result<string, Error>>`
- [ ] `getLanguageModel()` returns `Promise<Result<LanguageModel, Error>>`
- [ ] No `try-catch` blocks remain in `ai.ts`
- [ ] All `throw new Error()` replaced with `Result.error()`
- [ ] `generateText()` call wrapped with `Result.wrap()` since AI SDK may throw
- [ ] Callers in `cmd/generate.ts` and `cmd/commit.ts` updated to handle `Result`
- [ ] Pure functions (`getSystemPrompt()`, `createCommitPrompt()`, `isValidConventionalCommit()`, `parseConventionalCommit()`) unchanged — they don't need Result
- [ ] Tests updated for Result return types

---

## Technical Design

### Current Pattern (Forbidden)

```typescript
async function getLanguageModel(modelName: string) {
  // ...
  throw new Error(`Model "${modelName}" not found.`);
}
```

### New Pattern (Required)

```typescript
async function getLanguageModel(modelName: string): Promise<Result<LanguageModel, Error>> {
  // ...
  return Result.error(new Error(`Model "${modelName}" not found.`));
}
```

### Key Refactoring Points

1. **`getLanguageModel()`** — Return `Result.error()` instead of throwing; also handle `Result` from `getModelsDevData()` (after STORY-011)
2. **`generateCommitMessage()`** — Remove try-catch, return `Promise<Result<string, Error>>`; wrap `generateText()` with `Result.wrap()`
3. **`initializeAI()`** — Pure function, no changes needed (just returns an object)
4. **`displayCommitMessage()`** — Pure function (console output), no changes needed
5. **`parseConventionalCommit()`** — Pure function, no changes needed
6. **`isValidConventionalCommit()`** — Pure function, no changes needed

### Caller Updates

**`src/cmd/generate.ts`:**

```typescript
const commitResult = await generateCommitMessage(aiConfig, diff, changeSummary, options.message);
if (!commitResult.ok) {
  console.log(red(`❌ AI Generation Error: ${commitResult.error.message}`));
  Deno.exit(1);
}
const commitMessage = commitResult.value;
```

**`src/cmd/commit.ts`:** Similar pattern.

---

## Files to Create

- None

## Files to Modify

- `src/ai.ts` — Refactor to Result pattern
- `src/cmd/generate.ts` — Handle Result from generateCommitMessage
- `src/cmd/commit.ts` — Handle Result from generateCommitMessage
- `tests/main_test.ts` — Update test assertions

---

## Dependencies

- STORY-011 (models-dev.ts must already return Result types)
