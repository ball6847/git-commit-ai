---
name: code-style-linter
description: Aggressively review the git-commit-ai codebase for violations of project-specific code style rules (FORMATTING.md, TYPESCRIPT_RESULT_GUIDE.md, AGENTS.md). Use this skill whenever the user asks to check code style compliance, lint the codebase, find style violations, review code against project rules, or mentions "code-style-linter". This skill performs deep static analysis — it does NOT make changes, only reports violations with file paths, line numbers, code snippets, and suggested fixes.
---

# Code Style Linter

This skill performs an aggressive, thorough review of the git-commit-ai codebase against the project's specific style rules defined in `FORMATTING.md`, `TYPESCRIPT_RESULT_GUIDE.md`, and `AGENTS.md`.

## What This Skill Does

1. Scans all `.ts` files in `src/` and `tests/` directories
2. Checks every file against all project style rules
3. Reports every violation with file path, line number, code snippet, violated rule, and suggested fix
4. Organizes findings by priority (highest to lowest)
5. Does NOT make any code changes — only reports violations

## Rules Checked

### Critical (Result Pattern — from TYPESCRIPT_RESULT_GUIDE.md)

| Rule            | Description                                                                   |
| --------------- | ----------------------------------------------------------------------------- |
| No try-catch    | NO try-catch blocks allowed anywhere — use `Result.wrap()` and Result pattern |
| No throwing     | Functions must not throw — return `Result<T, Error>` instead                  |
| Check .ok first | Never access `result.value` without checking `result.ok` first                |

### High Priority (from FORMATTING.md)

| Rule                            | Description                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Curly braces                    | All `if`, `for`, `while` must have curly braces, even single-line bodies                 |
| Inline arrows with control flow | Extract inline arrow functions containing `if`/control flow into named functions         |
| Complex callbacks               | Extract callbacks wrapping complex logic (multi-line object params) into named functions |
| Object params 3+                | Object literals with 3+ properties as function args must be multi-line                   |
| Early-return                    | No careless early-return in main function flow — extract into dedicated helpers          |
| Thin wrappers                   | No functions that just wrap a single operation — inline them                             |
| No `any` types                  | Always use proper TypeScript types                                                       |
| Unused params                   | Remove unused parameters from function signatures                                        |

### Medium Priority

| Rule                   | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| Single-line statements | Keep non-control-flow statements on one logical line (let IDE handle breaks) |
| Function signatures    | Keep on single line when possible (let IDE handle)                           |

## How to Run

1. Read `FORMATTING.md`, `TYPESCRIPT_RESULT_GUIDE.md`, and `AGENTS.md` for the full rules
2. Use the `task` tool with `subagent_type: explore` to scan all `.ts` files in `src/` and `tests/`
3. Search for each violation type systematically:
   - `try {` for try-catch blocks
   - `throw new Error` for throwing functions
   - `: any` for any types
   - `catch \(_` or `catch \([^)]*\)` for unused catch parameters
   - Single-line `if`/`for`/`while` without braces
   - Inline arrow functions with control flow
   - `Deno.exit(` in non-top-level functions
4. Read each flagged file to verify violations and get exact line numbers
5. Compile a comprehensive report organized by priority

## Output Format

Report violations in this format:

```markdown
## File: path/to/file.ts

### Violation N: [Rule Name] (Rule #X)

- **Line N**: Brief description
- **Code**: The violating code snippet
- **Fix**: Suggested fix
```

Group violations by priority:

1. **Critical** — Result pattern violations (try-catch, throwing)
2. **High** — FORMATTING.md violations
3. **Medium** — Style preferences

End with a summary table and recommended fix order.

## Reference Files

Always read these before starting (relative to project root):

- `FORMATTING.md`
- `TYPESCRIPT_RESULT_GUIDE.md`
- `AGENTS.md`
