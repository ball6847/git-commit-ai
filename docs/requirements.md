# AI Commit Message Generator - Requirements

## 1. User Stories & Acceptance Criteria

### US1: Generate Conventional Commit Messages

**As a** developer
**I want to** automatically generate conventional commit messages from my staged changes
**So that** my commit history follows team standards and is easily readable

**Acceptance Criteria:**

- Messages follow format: `type(scope): description`
- Supports all conventional commit types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Description is concise and under 72 characters
- Scope is automatically detected from changed files/directories
- System validates generated messages against conventional commit regex

### US2: AI-Powered Message Analysis

**As a** developer
**I want to** leverage AI to analyze my code changes
**So that** the commit message accurately reflects the nature and impact of my changes

**Acceptance Criteria:**

- Analyzes Git diffs and file changes to determine commit type
- Uses OpenRouter API for AI-driven generation
- Supports configurable AI models via environment variable or CLI flag
- Default model: `mistralai/mistral-7b-instruct:free`
- Generates contextually appropriate commit messages

### US3: Interactive Commit Workflow

**As a** developer
**I want to** review and edit generated commit messages before committing
**So that** I maintain control over my commit history

**Acceptance Criteria:**

- Provides interactive editing interface for generated messages
- Supports dry-run mode to preview without committing
- Allows commit execution with generated/edited messages
- Shows Git status and staged changes before generation
- Commit should only occur after user confirmation or editing
- Cancelling during message editing should abort the entire commit operation

### US4: Configuration Management

**As a** developer
**I want to** configure the tool for my specific needs
**So that** it works with my development environment and preferences

**Acceptance Criteria:**

- API key configuration via OPENROUTER_API_KEY environment variable
- Model selection via OPENROUTER_MODEL environment variable or CLI flag
- Adjustable AI parameters (max_tokens, temperature)
- Clear error messages for missing configuration

### US5: Push Confirmation

**As a** developer
**I want to** confirm before pushing changes to remote repository
**So that** I can prevent accidental pushes

**Acceptance Criteria:**

- Prompts for confirmation after successful commit
- Defaults to 'no' for push confirmation
- Exits program if user does not confirm push
- Maintains existing functionality for commit message acceptance
- Push confirmation should only be shown after successful user-confirmed commit
- `-p/--push`: Optional flag that bypasses push confirmation when provided
- When flag is omitted, maintains default confirmation flow behavior

### US6: Automated Commit and Push Workflow

**As a** developer
**I want to** generate commits and push changes without manual intervention
**So that** I can automate my git workflow

**Acceptance Criteria:**

- Supports `-y` flag to automatically accept generated commit messages
- Supports `-p/--push` flag to automatically confirm push operations
- Works in both modes:
  - **Interactive mode**: Requires commit confirmation unless `-y` specified
  - **Non-interactive mode**: Requires `-y` for commit acceptance, `-p` for push
- Maintains push confirmation prompt when flags not used
- Ensures push only occurs after successful commit
- Returns appropriate exit codes for automation
- Preserves all validation rules from interactive mode

**Example Usage:**
- `gcai -y -p` → Auto-commit + auto-push
- `gcai -p` → Interactive commit + auto-push
- `gcai -y` → Existing behavior (auto-commit only)

## 2. Priority Classification

### Must Have (P0)

- Conventional commit message generation
- Git integration (staged changes detection, diff retrieval)
- OpenRouter API integration
- Basic CLI interface with `generate` command
- Git repository validation
- Error handling for missing API keys and network failures
- Push confirmation workflow

### Should Have (P1)

- Interactive message editing
- `status` subcommand for repository information
- Debug mode for troubleshooting
- Model selection options
- Comprehensive input validation

### Could Have (P2)

- Caching mechanisms for repeated operations
- Advanced debugging features
- Performance optimizations for large repositories
- Custom commit type definitions

## 3. Functional Specifications

### Input Requirements

- **Git Repository**: Valid Git repository with staged changes
- **API Configuration**: OpenRouter API key and model selection
- **File Changes**: Git diff data and modified file paths
- **User Input**: Optional manual edits to generated messages
- **Push Confirmation**: Explicit user confirmation for remote push

### Output Specifications

- **Commit Message**: Conventional commit formatted string
- **Validation Status**: Pass/fail with specific error details
- **Execution Result**: Success/failure of actual Git commit
- **Debug Information**: Detailed logs when debug mode enabled
- **Push Confirmation**: User decision to push or abort

### Processing Flow

```
1. Validate Git repository and staged changes
2. Extract diff and file change information
3. Send context to AI via OpenRouter API
4. Generate conventional commit message
5. Validate against conventional commit format
6. Present for user review/editing
7. Execute Git commit only if user confirms or accepts the message
7a. Abort operation if user cancels during message editing
8. Prompt for push confirmation
9. Push to remote (if confirmed) or exit
```

## 4. Technical Requirements

### CLI Interface

**Model Selection Priority:**

The model selection uses this cascading priority system:

1. **Explicit `--model` flag** (highest priority) - Temporary override for specific operations
2. **`OPENROUTER_MODEL` environment variable** - Persistent configuration across runs
3. **Default: `mistralai/mistral-7b-instruct:free`** - Reliable fallback (free & capable for commit messages)

#### Environment Variables

- `OPENROUTER_API_KEY` - OpenRouter API key required for AI-powered commit message generation
- `OPENROUTER_MODEL` - (Optional) Specifies which AI model to use for generating commit messages

#### Commands

- `generate` (aliases: gen, g)
  Description: Generates a conventional commit message from staged changes using AI
  Arguments: None
  Flags:
  - `--model <model-name>` - Specify which AI model to use (highest priority)
  - `--debug` - Enable verbose logging for debugging, including displaying the currently selected model
  - `--dry-run` - Show what would be committed without actually creating a commit
  - `-y, --yes` - Non-interactive mode, accept all prompts with default behavior
  - `-p, --push` - Push changes to remote after successful commit

- `status` (aliases: s)
  Description: Shows the current repository status and staged changes
  Arguments: None
  Flags: None

**Additional Features:**
- Interactive commit message editing before finalizing
- Automatic push option after successful commit
- Graceful SIGINT handling (Ctrl+C) with cancellation confirmation
- Detailed change summary display
- Conventional commit format validation

#### Exit Codes

- 0: Success
- 1: Error
- 2: Validation failure

### Git Integration

- Detect staged changes using `git diff --staged`
- Validate repository state before operations
- Execute commits with generated messages
- Handle empty repositories and initial commits
- Implement push confirmation workflow

### AI Integration

- OpenRouter API client with error handling
- Configurable model parameters
- System prompts optimized for commit message generation
- Response parsing and validation

### Validation Rules

- Conventional commit regex: `^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?: .{1,72}$`
- No trailing periods in descriptions
- Lowercase commit types
- Optional scope in parentheses

## 5. Non-Functional Requirements

### Performance

- Generate commit messages in <3 seconds for diffs up to 1000 lines
- Support repositories with up to 10,000 files
- Minimal memory footprint (<50MB during execution)

### Security

- Secure API key handling (no logging or exposure)
- Input sanitization for Git operations
- Explicit Deno permission requirements (`--allow-read`, `--allow-run`, `--allow-net`)

### Reliability

- Graceful degradation when API is unavailable
- Retry mechanism for network failures (3 attempts with exponential backoff)
- Clear error messages with actionable guidance

### Usability

- Intuitive CLI interface following Unix conventions
- Helpful error messages with suggested solutions
- Progress indicators for longer operations

## 6. Testing Requirements

### Unit Tests

- Commit message parsing and validation
- Git operation wrappers
- AI response processing
- Configuration management
- Push confirmation workflow

### Integration Tests

- End-to-end commit generation workflow
- API integration with mock responses
- Git repository operations
- Push confirmation integration

### Acceptance Tests

- All user stories validated with real scenarios
- Edge cases: empty diffs, binary files, large changes
- Error scenarios: no API key, invalid repository, network failures

## 7. Success Metrics

- **Accuracy**: 90%+ of generated commit messages are accepted without editing
- **Performance**: Sub-3 second response time for typical changes
- **Adoption**: Tool successfully integrates into existing developer workflows
- **Reliability**: 99%+ uptime when dependencies are available
