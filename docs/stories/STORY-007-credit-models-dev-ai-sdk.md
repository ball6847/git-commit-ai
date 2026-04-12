# Story: STORY-007 — Credit models.dev and AI SDK in README

**Epic:** EPIC-001 (models.dev Integration)
**Sprint:** 1
**Priority:** Medium
**Status:** Completed
**Points:** 1
**Created:** 2026-04-12

---

## User Story

As a maintainer of git-commit-ai, I want to properly credit models.dev and the AI SDK for their contributions so that we comply with open-source attribution norms and acknowledge the tools that make this project possible.

---

## Acceptance Criteria

- [x] Add models.dev attribution with link to https://models.dev in README.md
- [x] Add AI SDK attribution with link to https://sdk.vercel.ai in README.md
- [x] Place attributions in a dedicated "Credits" or "Acknowledgments" section
- [x] Keep attribution text concise (1-2 sentences each)
- [x] No breaking changes to existing README content

---

## Technical Notes

### Attribution Text (Suggested)

Add a new section near the end of README.md (after "Contributing" or before "License"):

```markdown
## Credits

- Model metadata powered by [models.dev](https://models.dev) — an open database of AI model capabilities
- Built with [AI SDK](https://sdk.vercel.ai) — TypeScript/JavaScript library for building AI-powered applications
```

### Files to Modify

| File        | Change                                  |
| ----------- | --------------------------------------- |
| `README.md` | Add "Credits" section with attributions |

---

## Definition of Done

- [x] README.md updated with Credits section
- [x] Links to models.dev and AI SDK are correct and functional
- [x] `deno fmt` passes (prose wrap preserved)
- [x] No other README content modified
