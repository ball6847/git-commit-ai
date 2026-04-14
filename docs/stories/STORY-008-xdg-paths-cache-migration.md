# STORY-008: XDG Base Directory Paths & Cache Migration

**Story ID:** STORY-008
**Priority:** High
**Status:** Not Started
**Epic:** Epic 1 — Configuration File Support
**Created:** 2026-04-13

---

## User Story

As a user of git-commit-ai, I want application data stored in standard XDG-compliant directories so that my system stays organized and follows platform conventions.

---

## Context

Currently, cache is stored at `~/.git-commit-ai/models-cache.json` — a dotfile in the home directory. This violates XDG Base Directory conventions. The new layout uses `~/.config/git-commit-ai/` for config and `~/.config/git-commit-ai/cache/` for cache (or `$XDG_CONFIG_HOME`/`$XDG_CACHE_HOME` if set). This story creates the paths module and migrates the cache before config file support is added.

---

## Acceptance Criteria

- [ ] New `src/paths.ts` module provides all application directory paths
- [ ] Config dir: `$XDG_CONFIG_HOME/git-commit-ai/` or `~/.config/git-commit-ai/`
- [ ] Cache dir: `$XDG_CACHE_HOME/git-commit-ai/` or `~/.cache/git-commit-ai/`
- [ ] Cache file: `<cache_dir>/models.json` (was `models-cache.json`)
- [ ] Config file: `<config_dir>/config.json`
- [ ] One-time migration: if old `~/.git-commit-ai/models-cache.json` exists and new cache path doesn't, move it
- [ ] Old directory `~/.git-commit-ai/` is removed after successful migration (if empty)
- [ ] All modules that reference cache paths (`src/models-dev.ts`) updated to use `src/paths.ts`
- [ ] No hardcoded path strings remain outside `src/paths.ts`

---

## Technical Design

### New Module: `src/paths.ts`

```typescript
import { join } from '@std/path';

function getConfigHome(): string {
  return Deno.env.get('XDG_CONFIG_HOME') || `${Deno.env.get('HOME')}/.config`;
}

function getCacheHome(): string {
  return Deno.env.get('XDG_CACHE_HOME') || `${Deno.env.get('HOME')}/.cache`;
}

const APP_NAME = 'git-commit-ai';

export function getConfigDir(): string {
  return join(getConfigHome(), APP_NAME);
}

export function getCacheDir(): string {
  return join(getCacheHome(), APP_NAME);
}

export function getConfigFile(): string {
  return join(getConfigDir(), 'config.json');
}

export function getModelsCacheFile(): string {
  return join(getCacheDir(), 'models.json');
}

export function getLegacyCacheDir(): string {
  return `${Deno.env.get('HOME')}/.git-commit-ai`;
}

export function getLegacyCacheFile(): string {
  return `${getLegacyCacheDir()}/models-cache.json`;
}
```

### Migration Logic

```typescript
export async function migrateLegacyCache(): Promise<void> {
  const legacyFile = getLegacyCacheFile();
  const newFile = getModelsCacheFile();
  const newDir = getCacheDir();

  // Check if legacy cache exists
  const legacyExists = await checkFileExists(legacyFile);
  if (!legacyExists) return;

  // Check if new cache already exists
  const newExists = await checkFileExists(newFile);
  if (newExists) return;

  // Migrate: ensure new dir, copy file, remove old
  await Deno.mkdir(newDir, { recursive: true });
  await Deno.rename(legacyFile, newFile);

  // Clean up old directory if empty
  try {
    await Deno.remove(getLegacyCacheDir());
  } catch {
    // Directory not empty or other error — leave it
  }
}
```

### `src/models-dev.ts` Changes

Replace hardcoded paths with imports from `src/paths.ts`:

```typescript
// Before:
const CACHE_DIR = `${Deno.env.get('HOME') || '.'}/.git-commit-ai`;
const CACHE_FILE = `${CACHE_DIR}/models-cache.json`;

// After:
import { getCacheDir, getModelsCacheFile } from './paths.ts';
// Use getCacheDir() and getModelsCacheFile() in functions
```

Note: Functions that create directories on write should call `getCacheDir()` / `getModelsCacheFile()` dynamically (not as module-level constants) to ensure XDG env vars are read at runtime.

---

## Files to Create

- `src/paths.ts` — Centralized XDG-compliant path module

## Files to Modify

- `src/models-dev.ts` — Replace hardcoded `CACHE_DIR`/`CACHE_FILE` with `paths.ts` imports
- `deno.json` — Add `@std/path` import (for `join()`)

---

## XDG Directory Layout

```
~/.config/git-commit-ai/
├── config.json              # User configuration (STORY-009)
└── cache/
    └── models.json          # models.dev API cache (migrated from ~/.git-commit-ai/models-cache.json)
```

Or with XDG env vars set:

```
$XDG_CONFIG_HOME/git-commit-ai/
├── config.json
└── $XDG_CACHE_HOME/git-commit-ai/
    └── models.json
```

---

## Migration Path

1. On first run after update, `migrateLegacyCache()` checks for `~/.git-commit-ai/models-cache.json`
2. If found and `~/.cache/git-commit-ai/models.json` doesn't exist, move the file
3. Attempt to remove empty `~/.git-commit-ai/` directory
4. If migration fails (permissions, etc.), log a warning and continue — the tool will re-fetch from models.dev

---

## Out of Scope

- Config file content (handled in STORY-009)
- Result pattern refactoring (handled in STORY-011)
- Windows/macOS platform-specific paths (follow XDG on all platforms for now)

---

## Dependencies

- `@std/path` for path joining (check if already in `deno.json`)
- This story must be completed before STORY-009 (config) and STORY-011 (cache paths in Result refactor)
