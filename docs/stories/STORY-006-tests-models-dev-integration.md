# Story: STORY-006 — Tests for models.dev Integration

**Epic:** EPIC-001 (models.dev Integration)
**Sprint:** 1
**Priority:** Medium
**Status:** Not Started
**Points:** 1
**Created:** 2026-04-12
**Depends on:** STORY-001, STORY-002, STORY-003

---

## User Story

As a developer, I want test coverage for the models.dev integration so that I can ensure reliability and catch regressions.

---

## Acceptance Criteria

- [ ] Test models.dev API fetching and caching
- [ ] Test provider discovery from env vars
- [ ] Test model resolution with mock data
- [ ] Test fallback behavior when models.dev unavailable
- [ ] All tests pass with `deno test`

---

## Technical Notes

### Test Cases

Add to `tests/main_test.ts`:

```typescript
// Mock models.dev response
const MOCK_MODELS_DEV_DATA = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    env: ['ANTHROPIC_API_KEY'],
    npm: '@ai-sdk/anthropic',
    models: {
      'claude-sonnet-4-5': {
        id: 'claude-sonnet-4-5',
        name: 'Claude Sonnet 4.5',
        attachment: true,
        reasoning: true,
        tool_call: true,
        temperature: true,
      },
    },
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    env: ['OPENAI_API_KEY'],
    npm: '@ai-sdk/openai',
    models: {
      'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        attachment: true,
        reasoning: false,
        tool_call: true,
        temperature: true,
      },
    },
  },
};

// Test: Provider discovery
Deno.test('models.dev provider discovery', async (t) => {
  await t.step('should find provider with matching env var', () => {
    Deno.env.set('TEST_ANTHROPIC_KEY', 'sk-test-xxx');
    // Test getProviderApiKey with mock provider using TEST_ANTHROPIC_KEY
    Deno.env.delete('TEST_ANTHROPIC_KEY');
  });

  await t.step('should return null when no env var set', () => {
    // Test getProviderApiKey returns null
  });

  await t.step('should filter available providers correctly', () => {
    // Test getAvailableProviders filters by env vars
  });
});

// Test: Cache behavior
Deno.test('models.dev caching', async (t) => {
  await t.step('should return cached data within TTL', async () => {
    // Mock cache file with recent timestamp
  });

  await t.step('should fetch fresh data when cache expired', async () => {
    // Mock cache file with old timestamp
  });

  await t.step('should fallback to cache on fetch failure', async () => {
    // Mock fetch failure, verify cached data returned
  });
});

// Test: SDK loading
Deno.test('models.dev SDK loading', async (t) => {
  await t.step('should load bundled provider SDK', () => {
    // Test getProviderSDK with anthropic
  });

  await t.step('should fallback to openai-compatible for unknown npm', () => {
    // Test fallback behavior
  });

  await t.step('should cache SDK instances', () => {
    // Test that second call returns same instance
  });
});
```

### Test Strategy

| Area               | Approach                                        |
| ------------------ | ----------------------------------------------- |
| API Fetching       | Mock `fetch()` or use test fixtures             |
| Caching            | Mock file system operations                     |
| Provider Discovery | Set/unset env vars in test                      |
| SDK Loading        | Test with real bundled providers                |
| Fallback           | Mock fetch failure, verify graceful degradation |

---

## Files to Modify

| File                 | Change                           |
| -------------------- | -------------------------------- |
| `tests/main_test.ts` | Add models.dev integration tests |

---

## Gherkin Scenarios

### Scenario 1: Tests run successfully

```gherkin
Given all test cases are implemented
When I run "deno test --allow-run --allow-env --allow-read"
Then all tests pass
And no errors are thrown
```

---

## Definition of Done

- [ ] All test cases implemented in `tests/main_test.ts`
- [ ] `deno test --allow-run --allow-env --allow-read` passes
- [ ] `deno lint` passes
- [ ] Test coverage for: fetching, caching, provider discovery, SDK loading, fallback
