# Git Commit AI - Generate Command Flag Analysis Report

## Overview

This report provides a comprehensive analysis of all flags available in the `git-commit-ai generate` command, including their effects, usage examples, and expected outputs.

## Flag Analysis

### 1. `--model <model>` (Short: `-m`)

**Effect:** Specifies which AI model to use for generating the commit message.

**Implementation:**

- Used in `src/cmd/generate.ts:70-76` to validate model presence
- Passed to AI configuration in `src/cmd/generate.ts:98`
- Used by the AI generation function in `src/cmd/generate.ts:107-112`

**Example Usage:**

```bash
deno task start generate --model "meta-llama/llama-3.2-3b-instruct"
```

**Expected Output:**

- Uses the specified model for commit message generation
- Different models may produce different commit message styles and quality
- Error if model is not specified and no default is configured

**Error Case:**

```
❌ Error: No model specified. Please provide a model using the --model option or set GIT_COMMIT_AI_MODEL environment variable.
```

---

### 2. `--message <message>` (Short: `-M`)

**Effect:** Provides additional context to guide the AI in generating a more specific commit message.

**Implementation:**

- Passed to the AI generation function in `src/cmd/generate.ts:111`
- Used as additional context for the AI to understand the intent

**Example Usage:**

```bash
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --message "refactor this function for better performance"
```

**Expected Output:**

- AI generates a commit message that specifically addresses the provided context
- Message will likely include terms like "refactor" and "performance"
- Example: "refactor: improve function performance by optimizing algorithm"

---

### 3. `--max-tokens <maxTokens>`

**Effect:** Limits the maximum number of tokens the AI can use in its response.

**Implementation:**

- Passed to AI configuration in `src/cmd/generate.ts:98`
- Controls the length and verbosity of the generated commit message

**Example Usage:**

```bash
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --max-tokens 50
```

**Expected Output:**

- Generates a shorter, more concise commit message
- Limits the AI response to approximately the specified token count
- Useful for enforcing brief commit messages

**Default Value:** 200 tokens (from `src/cli.ts:34`)

---

### 4. `--temperature <temperature>`

**Effect:** Controls the creativity vs. determinism of the AI response.

**Implementation:**

- Passed to AI configuration in `src/cmd/generate.ts:98`
- Values range from 0.0 (deterministic) to 1.0 (creative)

**Example Usage:**

```bash
# More deterministic output
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --temperature 0.1

# More creative output
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --temperature 0.9
```

**Expected Output:**

- **Low temperature (0.1):** More predictable, consistent commit messages
- **High temperature (0.9):** More varied, potentially creative commit messages
- **Default (0.3):** Balanced approach

**Default Value:** 0.3 (from `src/cli.ts:35`)

---

### 5. `--debug` (Short: `-d`)

**Effect:** Enables verbose debug output during execution.

**Implementation:**

- Used in `src/cmd/generate.ts:62-67` to show debug information
- Displays git diff preview and model information
- Shows error stack traces in `src/cmd/generate.ts:163-164`

**Example Usage:**

```bash
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --debug
```

**Expected Output:**

```
Debug: Git diff preview:
+import { foo } from 'bar';
...
Debug: Using model: meta-llama/llama-3.2-3b-instruct
```

**Additional Debug Features:**

- Shows stack traces for errors when enabled
- Helps with troubleshooting API issues
- Displays internal processing details

---

### 6. `--dry-run`

**Effect:** Generates the commit message without actually committing.

**Implementation:**

- Used in `src/cmd/generate.ts:128-133`
- Skips the commit and push steps
- Exits after displaying the generated message

**Example Usage:**

```bash
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --dry-run
```

**Expected Output:**

```
🚀 Git Commit AI - Conventional Commit Generator

📝 Generated Commit Message:
feat: add new user authentication feature

🏃 Dry run completed. Use without --dry-run to commit.
```

**Use Cases:**

- Preview commit message before actual commit
- Test different models/messages without affecting git history
- Review AI-generated messages for quality

---

### 7. `--commit`

**Effect:** Auto-accepts the generated commit message without prompting for confirmation. Naming aligns with `--push` — both flags describe the action being auto-confirmed without prompting.

**Implementation:**

- Used in `src/cmd/generate.ts:137-139`
- Skips the interactive prompt
- Automatically uses the AI-generated message

**Example Usage:**

```bash
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --commit
```

**Expected Output:**

```
✅ Using --commit - auto-accepting commit
✅ Successfully committed!
```

**Use Cases:**

- CI/CD pipelines where no user interaction is available
- Automated workflows
- When you trust the AI to generate appropriate messages

---

### 8. `--push` (Short: `-p`)

**Effect:** Auto-accepts push to remote without prompting. Naming aligns with `--commit` — both flags describe the action being auto-confirmed without prompting.

**Implementation:**

- Used in `src/cmd/generate.ts:151-156`
- Calls `pushChanges(undefined)` which auto-accepts the push
- Skips the push confirmation prompt
- Overrides `--no-push` flag and `GIT_COMMIT_AI_NO_PUSH` environment variable

**Example Usage:**

```bash
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --push
```

**Expected Output:**

```
✅ Successfully committed!
✅ Using --push flag - auto-accepting push
🚀 Successfully pushed changes!
```

**Use Cases:**

- Automated deployment workflows
- CI/CD pipelines
- When you want to commit and push in one step

---

### 9. `--no-push`

**Effect:** Skips the push step entirely without prompting. Useful for workflows that commit but handle push separately.

**Implementation:**

- Used in `src/cmd/generate.ts:160-170`
- Skips push confirmation prompt and push operation entirely
- Can be overridden by `--push` flag

**Priority:** `--push` > `--no-push` > `GIT_COMMIT_AI_NO_PUSH` env var > default (show prompt)

**Example Usage:**

```bash
# Skip push entirely
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --no-push

# --push overrides --no-push
deno task start generate --model "meta-llama/llama-3.2-3b-instruct" --push --no-push
```

**Expected Output:**

```
# With --no-push only:
✅ Successfully committed!
📋 Push skipped (--no-push).

# With --push --no-push:
⚠️  --push overrides --no-push.
✅ Successfully committed!
✅ Using --push flag - auto-accepting push
🚀 Successfully pushed changes!
```

**Use Cases:**

- Users who never push from the generate command
- CI/CD pipelines that commit but handle push separately
- Users who want to review before pushing later

---

## Flag Priority Rules

### Priority Order: `--dry-run` > `--push` > `--commit`

When conflicting flags are combined, the following priority rules apply:

| Flags Combined              | Behavior                                | Output                                                       |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| `--dry-run`                 | Generate only, no commit, no push       | "🏃 Dry run completed. Use without --dry-run to commit."     |
| `--dry-run --commit`        | Generate only (dry-run wins)            | "⚠️ --dry-run is active: ignoring --commit flags"            |
| `--dry-run --push`          | Generate only (dry-run wins)            | "⚠️ --dry-run is active: ignoring --push flags"              |
| `--dry-run --commit --push` | Generate only (dry-run wins)            | "⚠️ --dry-run is active: ignoring --commit and --push flags" |
| `--commit --push`           | Commit and push without prompts         | Both actions auto-accepted                                   |
| `--commit`                  | Commit without prompt, then push prompt | "Using --commit - auto-accepting commit"                     |
| `--push`                    | Commit prompt, then push without prompt | "Using --push flag - auto-accepting push"                    |

### Push Decision Priority

When multiple push-related options are present:

```
--push (CLI flag) > --no-push (CLI flag) > GIT_COMMIT_AI_NO_PUSH (env var) > default (show prompt)
```

| `--push` | `--no-push` | `GIT_COMMIT_AI_NO_PUSH` | Behavior                           |
| -------- | ----------- | ----------------------- | ---------------------------------- |
| -        | -           | -                       | Show push prompt (current default) |
| yes      | -           | any                     | Auto-push (override everything)    |
| -        | yes         | any                     | Skip push entirely                 |
| -        | -           | `true`                  | Skip push entirely                 |
| yes      | yes         | any                     | Auto-push (`--push` always wins)   |

---

## Flag Interaction Examples

### Example 1: Full automated workflow

```bash
deno task start generate \
  --model "meta-llama/llama-3.2-3b-instruct" \
  --message "fix critical security vulnerability" \
  --max-tokens 100 \
  --temperature 0.2 \
  --commit \
  --push
```

**Expected Behavior:**

1. Uses specified model with constrained creativity
2. Generates a security-focused commit message
3. Auto-accepts the message
4. Commits and pushes without prompts

### Example 2: Debug and preview

```bash
deno task start generate \
  --model "meta-llama/llama-3.2-3b-instruct" \
  --debug \
  --dry-run
```

**Expected Behavior:**

1. Shows debug information including git diff
2. Generates commit message
3. Displays message but doesn't commit
4. Exits without modifying git state

---

## Environment Variable Alternatives

Most flags can also be set via environment variables:

| Flag            | Environment Variable        | Default Value |
| --------------- | --------------------------- | ------------- |
| `--model`       | `GIT_COMMIT_AI_MODEL`       | (required)    |
| `--temperature` | `GIT_COMMIT_AI_TEMPERATURE` | 0.3           |
| `--max-tokens`  | `GIT_COMMIT_AI_MAX_TOKENS`  | 200           |
| `--no-push`     | `GIT_COMMIT_AI_NO_PUSH`     | (unset)       |

**Priority Order:** CLI flags > Environment variables > Defaults

---

## Summary Table

| Flag            | Short | Type    | Default    | Purpose                               |
| --------------- | ----- | ------- | ---------- | ------------------------------------- |
| `--model`       | `-m`  | string  | (required) | Specify AI model                      |
| `--message`     | `-M`  | string  | none       | Guide AI with context                 |
| `--max-tokens`  | none  | number  | 200        | Limit response length                 |
| `--temperature` | none  | number  | 0.3        | Control creativity                    |
| `--debug`       | `-d`  | boolean | false      | Enable debug output                   |
| `--dry-run`     | none  | boolean | false      | Preview without commit                |
| `--commit`      | none  | boolean | false      | Auto-accept message without prompting |
| `--push`        | `-p`  | boolean | false      | Auto-accept push without prompting    |
| `--no-push`     | none  | boolean | false      | Skip push step entirely               |

---

## Recommendations

1. **For CI/CD:** Use `--commit --push` for fully automated workflows
2. **For testing:** Use `--dry-run` to preview messages (takes priority over `--commit` and `--push`)
3. **For debugging:** Use `--debug` to troubleshoot issues
4. **For consistency:** Use lower temperature (0.1-0.3) for predictable messages
5. **For creativity:** Use higher temperature (0.7-0.9) for varied messages
6. **For commit-only workflows:** Use `--commit --no-push` to commit without pushing
7. **For environment-based push control:** Set `GIT_COMMIT_AI_NO_PUSH=true` to skip push by default

This comprehensive analysis shows that all flags are properly implemented and serve distinct purposes in the commit generation workflow.
