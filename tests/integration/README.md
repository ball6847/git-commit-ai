# Integration Tests

This directory contains integration tests for the `git-commit-ai` CLI.

## Current Coverage

- **`generate-tests/`** — Tests for the `generate` command flags and combinations.

## Approach

- **Real git repositories**: Tests create temporary git repos using `Deno.makeTempDir()` and run actual `git` commands.
- **Mocked AI service**: `ts-mockito` mocks the AI generation layer so tests are fast and deterministic.
- **Behavioral assertions**: Tests verify outcomes (e.g., "commit exists in log") rather than implementation details.

## Structure

```
tests/integration/
├── helpers/
│   ├── temp-repo.ts        # Git sandbox utilities
│   ├── mockito-harness.ts  # ts-mockito AI mock setup
│   └── test-harness.ts     # Combines repo + mock + harness.run()
├── generate-tests/
│   ├── model-flag.test.ts
│   ├── message-flag.test.ts
│   ├── ai-params.test.ts
│   ├── debug-flag.test.ts
│   ├── dry-run-flag.test.ts
│   ├── yes-flag.test.ts
│   ├── push-flag.test.ts
│   └── combinations.test.ts
└── README.md
```

## Running Tests

```bash
# Run all integration tests
 deno task test:integration

# Run a specific test file
 deno test --allow-run --allow-env --allow-read --allow-write tests/integration/flag-tests/model-flag.test.ts
```

## Test Harness

Each test creates a `Harness` via `createHarness()`:

- `harness.repo` — temp git repo with `stageFile()`, `isCommitted()`, `cleanup()`
- `harness.ai` — ts-mockito mock with `setResponse()`
- `harness.logs` — captured logger output array
- `harness.run(options)` — invokes `handleGenerate()` with injected dependencies

The harness injects:

- `generateCommitMessage` — routed to the ts-mockito mock
- `isGitRepository`, `getChangeSummary`, `getStagedDiff` — wrapped to use the temp repo directory
- `cwd` — passed to `git commit` and `git push`
- `logger` — captures output to `harness.logs` / `harness.errors`
- `exit` — throws `ExitError` instead of terminating the process

## Parallel Safety

Tests are fully parallel-safe because each test uses an isolated temp directory and all git operations are scoped to that directory via the injected `cwd`.
