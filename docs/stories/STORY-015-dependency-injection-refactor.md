---
story_id: STORY-015
title: Dependency Injection Refactor for generate.ts
created_at: 2026-04-13
status: Completed
sprint: Sprint 2
epic: Epic 4 - Testing Infrastructure
---

# Story 2.8: Dependency Injection Refactor for generate.ts

**Story ID:** STORY-015
**Priority:** High
**Status:** Not Started
**Sprint:** Sprint 2
**Epic:** Epic 4 - Testing Infrastructure

## User Story

As a developer, I want `src/cmd/generate.ts` refactored to support dependency injection so that the generate command can be tested with mocked AI and console output without relying on real network calls or git repositories.

## Acceptance Criteria

- [ ] `GenerateDependencies` interface exported from `src/cmd/generate.ts`
- [ ] Interface includes optional `generateCommitMessage` function (from `src/ai.ts`)
- [ ] Interface includes optional `console` object with `log` and `error` methods
- [ ] `defaultDeps` object created with real implementations as defaults
- [ ] `handleGenerate()` accepts optional second parameter `deps: GenerateDependencies`
- [ ] All `console.log()` calls changed to use injected `cons.log()`
- [ ] All `console.error()` calls changed to use injected `cons.error()`
- [ ] Direct import of `generateCommitMessage` replaced with destructured `generateCommitMessage` from deps
- [ ] All existing functionality preserved (no behavioral changes)
- [ ] `deno check src/cli.ts` passes without errors
- [ ] `deno lint` passes without errors
- [ ] `deno task test` passes (existing tests still work)

## Technical Notes

### Interface Design

```typescript
export interface GenerateDependencies {
  generateCommitMessage?: typeof import('../ai.ts').generateCommitMessage;
  console?: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

const defaultDeps: GenerateDependencies = {
  generateCommitMessage: aiGenerateCommitMessage,
  console: globalThis.console,
};

export async function handleGenerate(
  options: GenerateOptions,
  deps: GenerateDependencies = {},
): Promise<void> {
  const { generateCommitMessage, console: cons } = { ...defaultDeps, ...deps };
  // Use cons.log and cons.error instead of console.*
  // Use generateCommitMessage instead of direct import
}
```

### Why This Approach

- **Non-breaking change**: Optional parameter defaults to real implementations
- **Production code unchanged**: No performance or behavior impact
- **Testable**: Tests can inject mocks via the `deps` parameter
- **Type-safe**: TypeScript ensures mock interfaces match real implementations
- **Clean**: No global state manipulation or complex setup

### Key Refactoring Points

1. **Line 1**: Change `import { displayCommitMessage, generateCommitMessage } from '../ai.ts';` to keep `displayCommitMessage` import but rename `generateCommitMessage` import to `aiGenerateCommitMessage` (to avoid name collision)

2. **After imports**: Add `GenerateDependencies` interface and `defaultDeps` object

3. **Function signature**: Change `handleGenerate(options: GenerateOptions)` to `handleGenerate(options: GenerateOptions, deps: GenerateDependencies = {})`

4. **Console calls**: Replace all `console.log(...)` with `cons.log(...)` and `console.error(...)` with `cons.error(...)`

5. **AI call**: Replace direct `generateCommitMessage(...)` call with the destructured version from deps

## Files to Create

- None

## Files to Modify

- `src/cmd/generate.ts` - Add interface, default deps, refactor to use injected dependencies

## Dependencies

- None (uses existing imports)

## Story Points

2

## Notes

This is a prerequisite for STORY-016 (Integration Testing with ts-mockito). Without dependency injection, we cannot mock the AI module or capture console output in tests. The refactoring is purely structural - no business logic changes.
