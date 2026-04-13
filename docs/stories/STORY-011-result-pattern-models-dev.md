# STORY-011: Result Pattern — models-dev.ts

**Story ID:** STORY-011
**Priority:** Medium
**Status:** Not Started
**Epic:** Epic 2 — TypeScript Result Pattern Refactoring
**Created:** 2026-04-13

---

## User Story

As a developer, I want `models-dev.ts` to use the `Result` pattern throughout so that all errors are handled in a type-safe manner without any try-catch blocks.

---

## Context

The project's `TYPESCRIPT_RESULT_GUIDE.md` mandates that **NO TRY-CATCH BLOCKS ARE ALLOWED** anywhere in the codebase. Currently, `models-dev.ts` uses try-catch for caching, file I/O, and network operations. This story refactors it to use `typescript-result` throughout.

Cache paths are now provided by `src/paths.ts` (STORY-008), so this refactoring works against the new XDG-compliant paths.

---

## Acceptance Criteria

- [ ] `fetchFromApi()` returns `Promise<Result<ModelsDevResponse, Error>>`
- [ ] `getModelsDevData()` returns `Promise<Result<ModelsDevResponse, Error>>`
- [ ] `refreshModelsDevCache()` returns `Promise<Result<ModelsDevResponse, Error>>`
- [ ] `saveCache()` uses `Result.wrap()` for file operations
- [ ] `loadCache()` uses `Result.wrap()` for file operations
- [ ] `clearModelsDevCache()` uses `Result.wrap()` for file operations
- [ ] No `try-catch` blocks remain in `models-dev.ts`
- [ ] All callers updated to handle `Result` return types
- [ ] Tests updated for `Result` return types (check `.ok` property)
- [ ] All existing tests pass after refactoring
- [ ] Cache paths use `getCacheDir()` / `getModelsCacheFile()` from `src/paths.ts`

---

## Technical Design

### Current Pattern (Forbidden)

```typescript
async function loadCache(): Promise<CachedModelsDev | null> {
  try {
    const raw = await Deno.readTextFile(CACHE_FILE);
    const cached: CachedModelsDev = JSON.parse(raw);
    return cached;
  } catch {
    return null;
  }
}
```

### New Pattern (Required)

```typescript
const readFile = Result.wrap(Deno.readTextFile);

async function loadCache(): Promise<Result<CachedModelsDev, Error>> {
  const cacheFile = getModelsCacheFile();
  const rawResult = await readFile(cacheFile);
  if (!rawResult.ok) {
    return Result.error(new Error(`Failed to read cache: ${rawResult.error.message}`));
  }

  const parseResult = Result.wrap(() => JSON.parse(rawResult.value));
  if (!parseResult.ok) {
    return Result.error(new Error(`Failed to parse cache: ${parseResult.error.message}`));
  }

  return Result.ok(parseResult.value as CachedModelsDev);
}
```

### Key Refactoring Points

1. **`loadCache()`** — Wrap `Deno.readTextFile` and `JSON.parse` with `Result.wrap()`
2. **`saveCache()`** — Wrap `Deno.mkdir` and `Deno.writeTextFile` with `Result.wrap()`
3. **`fetchFromApi()`** — Wrap `fetch()` and `response.json()` with `Result.wrap()`
4. **`getModelsDevData()`** — Chain Results instead of try-catch; return `Result.ok(data)` on success
5. **`refreshModelsDevCache()`** — Same Result chaining pattern
6. **`clearModelsDevCache()`** — Wrap `Deno.remove` with `Result.wrap()`
7. **Remove module-level `CACHE_DIR`/`CACHE_FILE` constants** — Use `getCacheDir()`/`getModelsCacheFile()` from `src/paths.ts`

### Caller Updates

- `src/ai.ts` — `getLanguageModel()` must handle `Result` from `getModelsDevData()`
- `src/cmd/model.ts` — `handleModel()` must handle `Result` from `getModelsDevData()`

---

## Files to Create

- None

## Files to Modify

- `src/models-dev.ts` — Refactor all functions to Result pattern; use paths.ts
- `src/ai.ts` — Update callers to handle `Result` from models-dev functions
- `src/cmd/model.ts` — Update callers to handle `Result` from models-dev functions
- `tests/main_test.ts` — Update test assertions for `Result` types

---

## Dependencies

- STORY-008 (paths.ts must exist first for cache paths)
- `typescript-result` npm package

---

## Testing Strategy

- All existing tests must continue passing
- Update test assertions: `assertEquals(result.ok, true)` instead of assuming success
- For error path tests: `assertEquals(result.ok, false)` and `assertEquals(result.error.message, ...)`
- Test cache hit, cache miss, fetch failure, and cache corruption scenarios
