---
createdAt: "2026-04-13T00:00:00Z"
implementedAt: null
reviewedAt: null
---

# Plan: Robust Integration Testing Setup with ts-mockito

## Overview

This plan establishes a comprehensive integration testing framework for the `git-commit-ai generate` command flags using **ts-mockito** for automated mocking, real git sandboxing with temporary repositories, and a unified test harness pattern. The goal is to test all flag effects behaviorally (not implementation), ensuring confidence in CLI functionality.

## Target Structure

```
tests/integration/
├── helpers/
│   ├── temp-repo.ts          # Git repo lifecycle management
│   ├── mockito-harness.ts    # ts-mockito automated mocking
│   └── test-harness.ts       # Unified harness combining repo + mocks
├── flag-tests/
│   ├── model-flag.test.ts
│   ├── message-flag.test.ts
│   ├── max-tokens-flag.test.ts
│   ├── temperature-flag.test.ts
│   ├── debug-flag.test.ts
│   ├── dry-run-flag.test.ts
│   ├── yes-flag.test.ts
│   ├── push-flag.test.ts
│   └── combinations.test.ts
└── README.md                 # Testing documentation
```

## Dependencies to Add

Add to `deno.json` imports:
- `"ts-mockito": "npm:ts-mockito@^2.6.1"`

Update test tasks to include `--allow-write` for temp directory creation.

## Files to Create

### 1. `tests/integration/helpers/temp-repo.ts`

Create a helper for managing temporary git repositories:

- `createTempRepo(): Promise<TempRepo>` - Initialize git repo with initial commit
- `stageFile(filename, content): Promise<void>` - Stage a file change
- `getLog(): Promise<string>` - Get git log
- `isCommitted(message): Promise<boolean>` - Check if commit exists
- `cleanup(): Promise<void>` - Remove temp directory
- `git(args): Promise<string>` - Run arbitrary git commands

Use `Deno.makeTempDir` for isolation, configure git user.email/user.name, create initial commit so branches work.

### 2. `tests/integration/helpers/mockito-harness.ts`

Create automated mocking with ts-mockito:

- `createMockitoHarness()` function returning:
  - `aiMock`: Mocked generateCommitMessage function
  - `consoleMock`: Captured console output
  - `setResponse(message)`: Set static AI response
  - `setResponseFn(fn)`: Set dynamic AI response based on input
  - `getLastCall()`: Get {config, diff, summary, userMessage} from last call
  - `verifyAiCalled()`: Assertion helper
  - `logs: string[]`: Captured console.log output
  - `includes(text): boolean`: Check if text in output
  - `matches(regex)`: Regex matching on output
  - `getCommitMessage()`: Extract generated commit from output

Use ts-mockito's `mock()`, `when()`, `verify()`, `capture()`, `anything()`, `instance()`.

### 3. `tests/integration/helpers/test-harness.ts`

Combine temp-repo + mockito-harness into unified interface:

- `createHarness(): Promise<TestHarness>` returns:
  - `repo: TempRepo` - From temp-repo.ts
  - `mock: MockitoHarness` - From mockito-harness.ts
  - `run(options: Partial<GenerateOptions>): Promise<void>` - Execute handleGenerate with:
    - CWD set to temp repo
    - Mocked AI injected
    - Mocked console injected
  - `cleanup(): Promise<void>` - Cleanup temp repo

The `run()` method must:
1. Save original CWD
2. Chdir to temp repo path
3. Call `handleGenerate(fullOptions, deps)` with mocked dependencies
4. Restore original CWD (even on error)

### 4. `tests/integration/flag-tests/model-flag.test.ts`

Test `--model` flag:

```typescript
Deno.test('--model: passes model to AI config', async () => {
  const harness = await createHarness();
  try {
    await harness.repo.stageFile('test.ts', '// test');
    harness.mock.setResponse('feat: test');
    
    await harness.run({ model: 'custom-model-123' });
    
    const call = harness.mock.getLastCall();
    assertEquals(call.config.model, 'custom-model-123');
  } finally {
    await harness.cleanup();
  }
});
```

### 5. `tests/integration/flag-tests/message-flag.test.ts`

Test `--message` flag passes context to AI:

```typescript
Deno.test('--message: passes user context to AI', async () => {
  const harness = await createHarness();
  try {
    await harness.repo.stageFile('auth.ts', '// auth');
    harness.mock.setResponse('fix: auth issue');
    
    await harness.run({ 
      model: 'test-model',
      message: 'Fix critical XSS in auth',
      dryRun: true 
    });
    
    const call = harness.mock.getLastCall();
    assertEquals(call.userMessage, 'Fix critical XSS in auth');
  } finally {
    await harness.cleanup();
  }
});
```

### 6. `tests/integration/flag-tests/ai-params.test.ts`

Test `--temperature` and `--max-tokens`:

```typescript
Deno.test('--temperature and --max-tokens: passed to AI config', async () => {
  const harness = await createHarness();
  try {
    await harness.repo.stageFile('params.ts', '// params');
    harness.mock.setResponse('chore: params');
    
    await harness.run({ 
      model: 'test-model',
      temperature: 0.85,
      maxTokens: 75,
      dryRun: true 
    });
    
    const call = harness.mock.getLastCall();
    assertEquals(call.config.temperature, 0.85);
    assertEquals(call.config.maxTokens, 75);
  } finally {
    await harness.cleanup();
  }
});
```

### 7. `tests/integration/flag-tests/debug-flag.test.ts`

Test `--debug` shows diff and model info:

```typescript
Deno.test('--debug: shows git diff preview and model', async () => {
  const harness = await createHarness();
  try {
    await harness.repo.stageFile('debug.ts', 'const DEBUG = true;');
    harness.mock.setResponse('feat: debug');
    
    await harness.run({ 
      model: 'debug-model',
      debug: true, 
      dryRun: true 
    });
    
    assertEquals(harness.mock.includes('Debug: Git diff preview'), true);
    assertEquals(harness.mock.includes('Debug: Using model: debug-model'), true);
    assertEquals(harness.mock.includes('const DEBUG = true'), true);
  } finally {
    await harness.cleanup();
  }
});
```

### 8. `tests/integration/flag-tests/dry-run-flag.test.ts`

Test `--dry-run` generates but doesn't commit:

```typescript
Deno.test('--dry-run: generates message but does not commit', async () => {
  const harness = await createHarness();
  try {
    await harness.repo.stageFile('feature.ts', 'export const x = 1;');
    harness.mock.setResponse('feat: add x');
    
    await harness.run({ model: 'test-model', dryRun: true });
    
    // Assert behavior: no commit in repo
    const committed = await harness.repo.isCommitted('feat: add x');
    assertEquals(committed, false);
    
    // But AI was called and output shown
    harness.mock.verifyAiCalled();
    assertEquals(harness.mock.includes('Dry run completed'), true);
  } finally {
    await harness.cleanup();
  }
});
```

### 9. `tests/integration/flag-tests/yes-flag.test.ts`

Test `--yes` (`--commit`) auto-commits without prompt:

```typescript
Deno.test('--yes: auto-commits without prompting', async () => {
  const harness = await createHarness();
  try {
    await harness.repo.stageFile('fix.ts', '// bugfix');
    harness.mock.setResponse('fix: resolve bug');
    
    await harness.run({ model: 'test-model', commit: true });
    
    const committed = await harness.repo.isCommitted('fix: resolve bug');
    assertEquals(committed, true);
    assertEquals(harness.mock.includes('Using --commit'), true);
  } finally {
    await harness.cleanup();
  }
});
```

### 10. `tests/integration/flag-tests/push-flag.test.ts`

Test `--push` pushes to remote:

```typescript
Deno.test('--push: pushes commits to remote', async () => {
  const harness = await createHarness();
  const remotePath = await Deno.makeTempDir({ prefix: 'remote-' });
  
  try {
    // Create bare remote
    await Deno.remove(remotePath, { recursive: true });
    await new Deno.Command('git', { 
      args: ['init', '--bare', remotePath],
      stdout: 'null'
    }).outputSync();
    
    await harness.repo.git(['remote', 'add', 'origin', remotePath]);
    await harness.repo.stageFile('push.ts', '// push');
    harness.mock.setResponse('feat: add push');
    
    await harness.run({ model: 'test-model', commit: true, push: true });
    
    // Verify local commit
    const committed = await harness.repo.isCommitted('feat: add push');
    assertEquals(committed, true);
    
    // Verify pushed to remote
    const remoteLog = new Deno.Command('git', {
      args: ['log', '--oneline'],
      cwd: remotePath,
      stdout: 'piped'
    }).outputSync();
    const logText = new TextDecoder().decode(remoteLog.stdout);
    assertEquals(logText.includes('feat: add push'), true);
  } finally {
    await harness.cleanup();
    await Deno.remove(remotePath, { recursive: true }).catch(() => {});
  }
});
```

### 11. `tests/integration/flag-tests/combinations.test.ts`

Test multiple flags together:

```typescript
Deno.test('combination: --debug --dry-run --message', async () => {
  const harness = await createHarness();
  try {
    await harness.repo.stageFile('combo.ts', '// combo');
    harness.mock.setResponse('feat: combo');
    
    await harness.run({ 
      model: 'test-model',
      dryRun: true,
      debug: true,
      message: 'Combo context'
    });
    
    assertEquals(harness.mock.includes('Debug:'), true);
    assertEquals(harness.mock.includes('Dry run completed'), true);
    assertEquals(harness.mock.getLastCall()?.userMessage, 'Combo context');
    
    const committed = await harness.repo.isCommitted('feat: combo');
    assertEquals(committed, false);
  } finally {
    await harness.cleanup();
  }
});
```

### 12. `tests/integration/README.md`

Document the testing setup:

- Purpose of integration tests
- How to run: `deno task test:integration`
- How to add new flag tests
- Architecture overview
- Troubleshooting

## Files to Modify

### 1. `src/cmd/generate.ts`

Add dependency injection interface and refactor:

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
  deps: GenerateDependencies = {}
) {
  const { generateCommitMessage, console: cons } = { ...defaultDeps, ...deps };
  // Use cons.log and generateCommitMessage instead of direct imports
}
```

### 2. `deno.json`

Add import:
```json
"ts-mockito": "npm:ts-mockito@^2.6.1"
```

Add test task:
```json
"test:integration": "deno test tests/integration/ --allow-run --allow-env --allow-read --allow-write --allow-net"
```

## Verification Commands

After implementation, run:

```bash
# Run all integration tests
deno task test:integration

# Run specific flag test
deno test tests/integration/flag-tests/dry-run-flag.test.ts --allow-run --allow-env --allow-read --allow-write

# Run with verbose output
deno test tests/integration/ --allow-all -- --verbose

# Check test coverage (if available)
deno test tests/integration/ --allow-all --coverage=cov_profile
```

All tests should:
- Complete in < 2 seconds each
- Pass consistently (no flakes)
- Clean up temp directories (verify with `ls /tmp/`)
- Show clear assertion failures if behavior changes

## Expected Outcome

1. All 8 flag behaviors are tested with real git repositories
2. Tests assert on behavior (commits exist in log) not implementation (which git command ran)
3. ts-mockito provides type-safe, expressive mocking
4. Test harness pattern makes each test ~10 lines
5. `deno task test:integration` runs full suite
6. Tests are parallel-safe (isolated temp repos)
7. No test pollution (automatic cleanup in finally blocks)

## Rollback Plan

If issues arise:

1. Remove `tests/integration/` directory
2. Revert changes to `src/cmd/generate.ts` (remove optional deps parameter)
3. Revert `deno.json` changes
4. Original tests remain in `tests/main_test.ts`

No breaking changes to production code - the dependency injection is additive (optional parameter defaults to real implementations).
