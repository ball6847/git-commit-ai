# Story: STORY-004 — Update Model Listing Command

**Epic:** EPIC-001 (models.dev Integration)
**Sprint:** 1
**Priority:** Medium
**Status:** Not Started
**Points:** 2
**Created:** 2026-04-12
**Depends on:** STORY-002

---

## User Story

As a user of git-commit-ai, I want to see all available models from models.dev in the `model` command so that I can discover and select from the full catalog.

---

## Acceptance Criteria

- [ ] `model` command fetches models.dev data (via STORY-001)
- [ ] Display models grouped by provider
- [ ] Mark providers as available (✓) or unavailable (✗) based on env vars
- [ ] Show model ID in `provider/model-id` format for selection
- [ ] Fallback to existing hardcoded models if models.dev fetch fails
- [ ] Output is clean and readable in terminal

---

## Technical Notes

### Implementation

Modify `src/cmd/model.ts`:

```typescript
import { getAvailableProviders, getModelsDevData } from '../models-dev.ts';
import { bold, dim, green, red } from '@std/fmt/colors';

export async function handleModelCommand(): Promise<void> {
  const data = await getModelsDevData();

  if (Object.keys(data).length === 0) {
    // Fallback to existing behavior
    console.log(dim('Could not fetch models.dev, showing built-in models...'));
    // ... existing model listing logic
    return;
  }

  const available = getAvailableProviders(data);
  const availableIds = new Set(available.map((p) => p.id));

  console.log(bold('\nAvailable Models (from models.dev)\n'));

  for (const [providerId, provider] of Object.entries(data)) {
    const isAvailable = availableIds.has(providerId);
    const status = isAvailable ? green('✓') : red('✗');
    const models = Object.values(provider.models);

    console.log(`${status} ${bold(provider.name)} (${providerId})`);

    for (const model of models) {
      const modelRef = `${providerId}/${model.id}`;
      const features = [];
      if (model.reasoning) features.push('reasoning');
      if (model.tool_call) features.push('tools');
      if (model.attachment) features.push('attachments');

      const featureStr = features.length > 0 ? dim(` [${features.join(', ')}]`) : '';
      console.log(`  ${modelRef}${featureStr}`);
    }
    console.log('');
  }

  console.log(dim('Set API key environment variables to enable providers.'));
  console.log(dim('Use: git-commit-ai generate --model provider/model-id'));
}
```

### Output Format Example

```
Available Models (from models.dev)

✓ Anthropic (anthropic)
  anthropic/claude-sonnet-4-5 [reasoning, tools, attachments]
  anthropic/claude-haiku-4-5 [reasoning, tools, attachments]

✗ OpenAI (openai)
  openai/gpt-4o [reasoning, tools, attachments]
  openai/gpt-4o-mini [reasoning, tools, attachments]

✓ Cerebras (cerebras)
  cerebras/zai-glm-4.6 [tools]

Set API key environment variables to enable providers.
Use: git-commit-ai generate --model provider/model-id
```

---

## Files to Modify

| File               | Change                                           |
| ------------------ | ------------------------------------------------ |
| `src/cmd/model.ts` | Integrate models.dev data, update display format |

---

## Gherkin Scenarios

### Scenario 1: Display models.dev catalog

```gherkin
Given models.dev data is available
And ANTHROPIC_API_KEY is set
When I run "git-commit-ai model"
Then I see Anthropic models marked with ✓
And I see other providers marked with ✗
And models are shown in provider/model-id format
```

### Scenario 2: Fallback on fetch failure

```gherkin
Given models.dev fetch fails
When I run "git-commit-ai model"
Then I see the existing built-in model listing
And a message indicating fallback mode
```

---

## Definition of Done

- [ ] `model` command shows models.dev catalog
- [ ] Providers marked as available/unavailable
- [ ] Fallback to existing listing works
- [ ] `deno check src/cmd/model.ts` passes
- [ ] `deno lint` passes
