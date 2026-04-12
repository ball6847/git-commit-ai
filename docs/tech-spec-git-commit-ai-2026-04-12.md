# Technical Specification: git-commit-ai

**Created:** 2026-04-12
**Project:** git-commit-ai
**Level:** 0 (Single atomic change)
**Type:** CLI tool

---

## Overview

git-commit-ai is a Deno-based CLI tool that generates conventional commit messages from staged git changes using AI models via the Vercel AI SDK.

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLI (cli.ts)                       │
│               Cliffy Command Framework               │
├─────────┬──────────┬─────────┬──────────┬───────────┤
│ generate│  commit  │  model  │  status  │  version  │
├─────────┴──────────┴─────────┴──────────┴───────────┤
│                                                      │
│  ┌──────────┐    ┌──────────────────────────────┐   │
│  │ git.ts   │    │          ai.ts               │   │
│  │          │    │  ┌────────────────────────┐  │   │
│  │ - diff   │    │  │  Vercel AI SDK (ai)    │  │   │
│  │ - status │    │  │  generateText()        │  │   │
│  │ - commit │    │  └────────┬───────────────┘  │   │
│  │ - push   │    │           │                   │   │
│  └──────────┘    │  ┌────────▼───────────────┐  │   │
│                  │  │    providers/index.ts   │  │   │
│                  │  ├────────────────────────┤  │   │
│                  │  │ openrouter │ cerebras  │  │   │
│                  │  │ kimi       │ ollama    │  │   │
│                  │  │ vachin     │ zai       │  │   │
│                  │  └────────────────────────┘  │   │
│                  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Technology Stack

| Component       | Technology                            |
|-----------------|---------------------------------------|
| Runtime         | Deno 1.40+                           |
| Language        | TypeScript (strict mode)              |
| CLI Framework   | Cliffy (jsr:@cliffy/command)          |
| AI Integration  | Vercel AI SDK (npm:ai@^5.0.90)        |
| AI Providers    | OpenRouter, Cerebras, Kimi, Ollama Cloud, Vachin, ZAI |
| Formatting      | @std/fmt/colors                       |
| Config          | @std/dotenv                           |
| Module System   | ES Modules, URL-based imports         |

## Module Breakdown

### `src/cli.ts` — Entry Point
- Initializes Cliffy CLI with 5 commands: `generate`, `commit`, `model`, `status`, `version`
- Loads `.env` via `@std/dotenv`
- Routes to command handlers in `src/cmd/`

### `src/cmd/generate.ts` — Primary Command
- Validates git repo and staged changes
- Resolves AI model from CLI flag or `GIT_COMMIT_AI_MODEL` env var
- Calls `generateCommitMessage()` from ai.ts
- Interactive prompt to edit/confirm commit message
- Optional push to remote
- Supports `--dry-run`, `--yes`, `--debug`, `--push`, `--model`, `--message`

### `src/cmd/commit.ts` — Quick Commit Command
- Auto-stages all changes (unless `--staged`)
- Generates and commits without interactive prompt
- Simpler flow than `generate`

### `src/git.ts` — Git Operations
- `getStagedDiff()` — `git diff --cached --diff-filter=d`
- `getChangeSummary()` — `git diff --cached --name-status`
- `isGitRepository()` — `git rev-parse --git-dir`
- `displayChangeSummary()` — formatted file list output
- All operations synchronous via `Deno.Command.outputSync()`

### `src/ai.ts` — AI Integration
- `generateCommitMessage()` — core function using `generateText()` from Vercel AI SDK
- `getLanguageModel()` — resolves model by name, special handling for `openrouter/` prefix
- `createCommitPrompt()` — builds prompt from diff, file summary, and optional user message
- `getSystemPrompt()` — system instructions for conventional commit format
- `isValidConventionalCommit()` — regex validation
- `parseConventionalCommit()` — parse message into type/scope/description
- Temperature: 0.3, Max tokens: 200 (defaults)

### `src/providers/` — Model Providers
- `index.ts` — aggregates all providers via `Promise.all()`
- Each provider exports `getModels()` returning `ModelRecord`
- Providers: cerebras, kimi, ollama_cloud, openrouter, vachin, zai_coding_plan

### `src/types.ts` — Type Definitions
- `ModelRecord`, `AIConfig`, `CLIOptions`, `ChangeSummary`, `FileChange`
- `ConventionalCommitType` union: feat|fix|docs|style|refactor|test|chore|perf|ci|build
- `ConventionalCommit` interface with type, scope, description, breakingChange

## Data Flow

```
User runs: git-commit-ai generate --model openrouter/meta-llama/llama-3.1-8b-instruct

1. cli.ts loads env, parses args via Cliffy
2. handleGenerate() in cmd/generate.ts
3. isGitRepository() → true
4. getChangeSummary() → { files: [...], totalFiles: N }
5. getStagedDiff() → raw diff string
6. generateCommitMessage(aiConfig, diff, summary, userMessage?)
   a. getLanguageModel("openrouter/meta-llama/llama-3.1-8b-instruct")
   b. createCommitPrompt(diff, summary, userMessage)
   c. generateText({ model, system, prompt, temperature })
   d. validate + clean response
7. displayCommitMessage()
8. promptForCommitMessage() → user edits or confirms
9. commitChanges(message) → git commit -m "..."
10. pushChanges() → git push (optional)
```

## Environment Variables

| Variable                  | Required | Default                          |
|---------------------------|----------|----------------------------------|
| `OPENROUTER_API_KEY`      | For OpenRouter | —                            |
| `GIT_COMMIT_AI_MODEL`     | No       | Must provide via `--model`       |
| `GIT_COMMIT_AI_MAX_TOKENS`| No       | 200                              |
| `GIT_COMMIT_AI_TEMPERATURE`| No      | 0.3                              |
| `DEBUG`                   | No       | —                                |

## Key Design Decisions

1. **Vercel AI SDK abstraction** — Provider-agnostic via `LanguageModelV2` interface
2. **OpenRouter special handling** — Dynamic model names require `createOpenRouter()` factory
3. **Synchronous git operations** — `outputSync()` for simplicity in CLI context
4. **No persistent config file** — Config via env vars and CLI flags only
5. **Prompt injection defense** — XML tags wrap user-controlled content with system rules to ignore instructions within them

## Potential Improvements

### Primary: models.dev Integration

Integrate [models.dev](https://models.dev) as an external model database to enable dynamic provider support:

1. **Fetch & Cache** — Fetch `https://models.dev/api.json`, cache to `~/.git-commit-ai/models-cache.json` (24h TTL)
2. **Auto-Discovery** — Check provider `env` fields against environment variables to find available providers
3. **SDK Loading** — Map models.dev `npm` field to Vercel AI SDK provider constructors
4. **Unified Model Selection** — `--model provider/model-id` format works across all models.dev providers

**Key Design Decisions:**
- **Additive approach** — models.dev adds on top of existing providers (backward compatible)
- **Cache-first** — Aggressive caching minimizes API calls
- **`@ai-sdk/openai-compatible` fallback** — Universal adapter for any provider with `api` base URL
- **No dynamic npm install** — Only use pre-bundled AI SDK packages (simpler, Deno-compatible)

See `docs/stories/sprint-1-plan.md` for full implementation plan.

## Testing

```bash
deno test --allow-run --allow-env --allow-read
```

Tests are in `tests/` directory.

## Build & Distribution

```bash
# Bundle for distribution
deno bundle --platform=deno src/cli.ts -o build/cli.js

# Install globally from source
deno install -f --global --allow-run --allow-env --allow-read --allow-net jsr:@ball6847/git-commit-ai
```
