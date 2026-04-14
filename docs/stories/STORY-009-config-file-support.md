# STORY-009: Config File Loading & Merging

**Story ID:** STORY-009
**Priority:** High
**Status:** Not Started
**Epic:** Epic 1 — Configuration File Support
**Created:** 2026-04-13

---

## User Story

As a user of git-commit-ai, I want to configure default settings in a global config file so that I don't have to pass CLI flags or set env vars every time I run the tool.

---

## Context

Currently, all configuration is done via CLI flags (`--model`, `--temperature`, `--max-tokens`) or environment variables (`GIT_COMMIT_AI_MODEL`, `GIT_COMMIT_AI_MAX_TOKENS`, `GIT_COMMIT_AI_TEMPERATURE`). This is tedious for repeated use. A global config file at `~/.config/git-commit-ai/config.json` provides a persistent way to set defaults.

---

## Acceptance Criteria

- [ ] Load config from `~/.config/git-commit-ai/config.json` (using `paths.ts` from STORY-008)
- [ ] Respect `$XDG_CONFIG_HOME` override for config directory
- [ ] Merge priority: CLI flags > env vars > config file > defaults
- [ ] Support `model`, `temperature`, `maxTokens`, `thinkingEffort` in config
- [ ] Support `providers` section for custom provider definitions
- [ ] Clear error message if config file has invalid JSON
- [ ] Config file is optional — tool works without it (current behavior preserved)
- [ ] No walk-up directory search — single global config location

---

## Technical Design

### Config File Path

```
~/.config/git-commit-ai/config.json
```

Or with XDG override:

```
$XDG_CONFIG_HOME/git-commit-ai/config.json
```

Use `getConfigFile()` from `src/paths.ts` (STORY-008).

### Config File Format

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "temperature": 0.3,
  "maxTokens": 200,
  "thinkingEffort": "medium",
  "providers": {
    "my-custom-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "api": "https://api.my-provider.com/v1",
      "env": ["MY_PROVIDER_API_KEY"]
    }
  }
}
```

### New Types (`src/types.ts`)

```typescript
export interface ConfigFile {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  thinkingEffort?: 'low' | 'medium' | 'high';
  providers?: Record<string, CustomProviderConfig>;
}

export interface CustomProviderConfig {
  npm?: string;
  api?: string;
  env: string[];
  extend?: boolean;
  models?: Record<string, CustomModelConfig>;
}

export interface CustomModelConfig {
  name: string;
  reasoning?: boolean;
  tool_call?: boolean;
  attachment?: boolean;
  temperature?: boolean;
}

export interface ResolvedConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  thinkingEffort?: 'low' | 'medium' | 'high';
  providers: Record<string, CustomProviderConfig>;
}
```

### New Module: `src/config.ts`

- `loadConfig(): Promise<Result<ConfigFile, Error>>` — Load from `getConfigFile()` path, parse JSON
- `mergeConfig(cliOptions, envVars, configFile, defaults): ResolvedConfig` — Merge with proper priority
- Use `Result.wrap(Deno.readTextFile)` for all file I/O
- Use `Result.wrap(() => JSON.parse(raw))` for JSON parsing

### Merge Priority (highest wins)

1. CLI flags (e.g., `--model anthropic/claude-sonnet-4-5`)
2. Environment variables (e.g., `GIT_COMMIT_AI_MODEL`)
3. Config file (`~/.config/git-commit-ai/config.json`)
4. Built-in defaults (`maxTokens: 200`, `temperature: 0.3`)

---

## Files to Create

- `src/config.ts` — Config loading and merging module

## Files to Modify

- `src/types.ts` — Add `ConfigFile`, `CustomProviderConfig`, `CustomModelConfig`, `ResolvedConfig`
- `src/cli.ts` — Load config at startup, pass `ResolvedConfig` into commands
- `src/cmd/generate.ts` — Use `ResolvedConfig` instead of manually merging env/flags
- `src/cmd/commit.ts` — Use `ResolvedConfig` instead of manually merging env/flags
- `deno.json` — Add `typescript-result` import

---

## Out of Scope

- Config file validation schema (beyond basic JSON parsing)
- Config file generation command (e.g., `git-commit-ai config init`)
- TOML or YAML config format (JSON only for now)
- Per-project (walk-up) config search — global config only

---

## Dependencies

- STORY-008 (XDG paths module must exist first)
- `typescript-result` npm package
