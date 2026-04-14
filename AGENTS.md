# AGENTS.md

## Project Overview

Git Commit AI is an AI-powered git commit message generator that follows conventional commit guidelines. It's built with TypeScript and Deno, using OpenRouter for AI capabilities. The tool analyzes staged git changes and automatically generates appropriate commit messages.

**Key Technologies:**

- TypeScript 5.x
- Deno 1.40+
- OpenRouter AI API
- AI SDK for model integration
- Cliffy for CLI framework

## Setup Commands

```bash
# Install Deno (if not already installed)
curl -fsSL https://deno.land/x/install/install.sh | sh

# Clone the repository
git clone https://github.com/ball6847/git-commit-ai.git
cd git-commit-ai

# Copy environment variables template
cp .env.example .env

# Add your OpenRouter API key to .env
# OPENROUTER_API_KEY=your_api_key_here

# Install dependencies (Deno handles this automatically)

# Install git hooks (lefthook) for automatic formatting and linting
lefthook install
```

## Development Workflow

```bash
# Start development server with file watching
deno task dev

# Run the CLI
deno task start

# Generate commit message for staged changes
deno task start generate

# Check git status
deno task start status

# Install locally for testing
deno task install:local

# Code quality checks
deno task fmt      # Format code
deno task lint     # Lint code
deno task test     # Run tests
deno task publish:dry  # Dry run publish check
```

**Required Deno Permissions:**

- `--allow-run` (execute git commands)
- `--allow-env` (read environment variables)
- `--allow-read` (read files)
- `--allow-net` (make network requests to OpenRouter)

## Testing Instructions

```bash
# Run all tests
deno test --allow-run --allow-env --allow-read

# Run specific test file
deno test --allow-run --allow-env --allow-read tests/test_file.ts

# Run tests with coverage (requires coverage tool)
deno test --allow-run --allow-env --allow-read --coverage=cov_profile
```

**Test File Locations:**

- Main tests: `tests/` directory
- Unit tests follow `*.test.ts` naming convention
- Integration tests use `*.integration.ts` pattern

## Code Style Guidelines

```bash
# Type checking
deno check src/cli.ts

# Linting
deno lint

# Formatting
deno fmt
```

**Code Style Rules:**

- TypeScript strict mode enabled
- 2-space indentation
- Single quotes for strings
- Semicolons required
- 100 character line width limit
- No implicit any types
- No unused locals or parameters
- Control flow statements must have curly braces (even for single-line bodies)
- Keep non-control-flow statements on a single logical line
- Object parameters with 3+ properties should be formatted across multiple lines
- Use early-return and early-continue patterns to reduce nesting
- Extract complex logic into focused helper functions (avoid thin wrappers)
- No `any` types - always use proper TypeScript types
- Remove unused parameters from function signatures
- Keep function signatures on a single line when possible

**Detailed Guidelines:**

- See [FORMATTING.md](./FORMATTING.md) for complete code formatting rules
- See [TYPESCRIPT_RESULT_GUIDE.md](./TYPESCRIPT_RESULT_GUIDE.md) for TypeScript Result pattern requirements

**File Organization:**

```
src/
├── ai.ts           # AI integration (models.dev provider resolution)
├── cli.ts          # CLI entry point
├── git.ts          # Git operations and utilities
├── models-dev.ts   # Models.dev fetching, caching, provider resolution, SDK loading
├── types.ts        # TypeScript type definitions
├── cmd/
│   ├── generate.ts # Generate commit message command
│   ├── model.ts    # Model management command
│   ├── status.ts   # Status check command
│   └── version.ts  # Version command
tests/
└── main_test.ts    # Main test file
```

## Build and Deployment

```bash
# Install locally for testing
deno task install:local

# Publish to JSR (triggered by version tags)
git tag v1.0.0
git push origin v1.0.0

# Install from JSR (recommended)
deno install -f --global --allow-run --allow-env --allow-read --allow-net jsr:@ball6847/git-commit-ai
```

## Pull Request Guidelines

**Title Format:** `[component] Brief description of changes`

**Required Checks:**

- `deno lint` passes
- `deno test --allow-run --allow-env --allow-read` passes
- Code follows conventional commit patterns
- Documentation updated if applicable

**Review Process:**

1. Ensure all tests pass
2. Verify linting passes
3. Check commit message follows conventional format
4. Include relevant issue references

## Additional Notes

**Common Gotchas:**

- Always stage changes before running generate (`git add`)
- Ensure OPENROUTER_API_KEY is set in environment
- Use Deno 1.40+ for full compatibility
- Run in git repository context

**Performance Considerations:**

- AI generation may take 5-15 seconds depending on model
- Network latency affects OpenRouter API calls
- Larger diffs may require more processing time

**Debugging:**

- Use `--debug` flag for detailed output
- Check Deno permissions if commands fail
- Verify API key is valid and has sufficient quota

**Monorepo Note:**
This is a single-package repository, not a monorepo. All source code is in the `src/` directory.

## Environment Variables

```env
# Required
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional
OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct  # Default model
DEBUG=true  # Enable debug output
```

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

- **Publish Workflow**: `.github/workflows/publish.yml`
- Triggered by semantic version tags (v1.0.0 format)
- Publishes package to JSR automatically
- Uses OIDC authentication for secure publishing
