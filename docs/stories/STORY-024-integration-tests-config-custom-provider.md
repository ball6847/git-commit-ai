---
story_id: STORY-024
title: Integration tests for config file loading and custom provider merging
created_at: 2026-04-14
status: Completed
sprint: Sprint 3
epic: Epic 2 - Config Integration Tests
---

# Story 3.2: Integration tests for config file loading and custom provider merging

**Story ID:** STORY-024
**Priority:** Medium
**Status:** Not Started
**Sprint:** Sprint 3
**Epic:** Epic 2 — Config Integration Tests

## User Story

As a developer, I want integration tests for config file loading and merging so that changes to the config system don't break existing behavior.

## Context

The config system (`src/config.ts`) loads a JSON config file from the XDG config directory and merges it with CLI options, environment variables, and hardcoded defaults. Currently this logic has no isolated integration tests. This story adds fast, hermetic tests that exercise `loadConfig()` and `mergeConfig()` without touching the user's real `~/.config/git-commit-ai/` directory.

## Acceptance Criteria

### `loadConfig()` Tests

- [ ] Returns empty config (`{}`) when file doesn't exist
- [ ] Returns parsed config when valid JSON file exists
- [ ] Returns error when file contains invalid JSON
- [ ] Returns error when file is not a JSON object (e.g., array, string, number)

### `mergeConfig()` Tests

- [ ] CLI options override config file values
- [ ] Env vars override config file values but not CLI options
- [ ] Config file values override defaults
- [ ] Custom providers from config file are merged into resolved config
- [ ] Custom providers from defaults are used when config file has no providers

### Infrastructure

- [ ] Tests use temporary directories for config files (no dependency on real `~/.config/git-commit-ai/`)
- [ ] All tests run in < 500ms each
- [ ] Tests placed in `tests/integration/config-tests/`

## Technical Design

### Refactor for testability

`loadConfig()` currently hardcodes `getConfigFile()`. To make it testable without mutating global environment variables, add an optional path parameter:

```typescript
export async function loadConfig(configPath?: string): Promise<Result<ConfigFile, Error>> {
  const path = configPath ?? getConfigFile();
  // ... rest of function uses `path` instead of `configPath`
}
```

This keeps the public API unchanged while making testing trivial.

### Example test patterns

```typescript
Deno.test('loadConfig: returns empty config when file does not exist', async () => {
  const result = await loadConfig('/nonexistent/path/config.json');
  assertEquals(result.ok, true);
  assertEquals(result.value, {});
});

Deno.test('loadConfig: parses valid config file', async () => {
  const tempDir = await Deno.makeTempDir();
  const configPath = `${tempDir}/config.json`;
  await Deno.writeTextFile(configPath, JSON.stringify({ model: 'gpt-4o', temperature: 0.5 }));

  const result = await loadConfig(configPath);
  assertEquals(result.ok, true);
  assertEquals(result.value.model, 'gpt-4o');
  assertEquals(result.value.temperature, 0.5);

  await Deno.remove(tempDir, { recursive: true });
});
```

For `mergeConfig()`, tests can call it directly with different combinations of `cliOptions`, `envVars`, `configFile`, and `defaults`:

```typescript
Deno.test('mergeConfig: CLI overrides config file', () => {
  const result = mergeConfig(
    { model: 'cli-model' },
    {},
    { model: 'config-model' },
    { model: 'default', maxTokens: 200, temperature: 0.3, providers: {} },
  );
  assertEquals(result.model, 'cli-model');
});
```

## Files to Create

- `tests/integration/config-tests/load-config.test.ts`
- `tests/integration/config-tests/merge-config.test.ts`
- `tests/integration/config-tests/test-harness.ts` (optional, for shared temp-dir helpers)

## Files to Modify

- `src/config.ts` — Add optional `configPath` parameter to `loadConfig()`

## Story Points

3

## Dependencies

- None
