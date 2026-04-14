# Git Commit AI 🤖

An AI-powered git commit message generator that follows conventional commit guidelines. Built with TypeScript and Deno, supporting multiple AI providers via [models.dev](https://models.dev).

## Features

- 🎯 **Conventional Commits**: Automatically generates standardized commit messages
- 🧠 **AI-Powered**: Uses AI for intelligent analysis of your changes
- 🔌 **Multi-Provider**: Supports OpenRouter, Anthropic, OpenAI, Cerebras, Mistral, Ollama, and custom OpenAI-compatible providers
- 📁 **File Analysis**: Analyzes staged changes and file modifications
- 🎨 **Beautiful CLI**: Colorful and intuitive command-line interface
- 🔍 **Smart Detection**: Identifies the type of changes (feat, fix, docs, etc.)
- 🛡️ **Validation**: Ensures generated messages follow conventional commit format
- ⚙️ **Configurable**: Environment variables and JSON config file support
- ⚡ **Deno Native**: Built with modern TypeScript and Deno runtime
- 🔒 **Secure**: Explicit permissions, local config in standard XDG directories

## Prerequisites

- **Deno 1.40+**: [Install Deno](https://deno.land/manual/getting_started/installation)
- **Git**: Version control system
- **AI Provider API Key**: Get a key from your chosen provider (e.g., [OpenRouter](https://openrouter.ai/), [Anthropic](https://anthropic.com), [OpenAI](https://openai.com), etc.)

## Installation

### Quick Install via JSR (Recommended)

```bash
deno install -f --global --allow-run --allow-env --allow-read --allow-write --allow-net jsr:@ball6847/git-commit-ai
```

### Manual Installation from Source

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ball6847/git-commit-ai.git
   cd git-commit-ai
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Add your settings to `.env`:**
   ```env
   GIT_COMMIT_AI_MODEL=your-provider/your-model
   # Also set your provider's API key environment variable
   ```

4. **Install locally for testing (optional):**
   ```bash
   deno task install:local
   ```

## Usage

### Quick Start

```bash
# Stage your changes
git add .

# Generate and commit with JSR installation (recommended)
git-commit-ai generate

# Or with manual installation
deno task start generate

# Or run directly from source
deno run --allow-run --allow-env --allow-read --allow-write --allow-net src/cli.ts generate
```

### Available Tasks

```bash
# Start the CLI
deno task start

# Development with file watching
deno task dev

# Install locally for testing
deno task install:local

# Run tests
deno task test

# Type checking
deno task check

# Linting
deno task lint

# Formatting
deno task fmt

# Dry run publish check
deno task publish:dry
```

### Commands

#### `generate` (or `gen`, `g`)

Generate a conventional commit message for staged changes:

```bash
# Basic usage
deno task start generate

# Use a specific model
git-commit-ai generate --model cerebras/llama-3.1-70b

# Adjust AI parameters
git-commit-ai generate --temperature 0.5 --max-tokens 300

# Dry run (generate without committing)
git-commit-ai generate --dry-run

# Auto-accept generated message without prompting
git-commit-ai generate --commit

# Auto-push after commit
git-commit-ai generate --push

# Skip push prompt entirely
git-commit-ai generate --no-push

# Debug mode
git-commit-ai generate --debug
```

**Smart Staging:** If you have no staged changes, `generate` will automatically stage all files for you. If you already staged some files, it will only generate a message for those staged files.

#### `status` (or `s`)

Show current git status and staged changes:

```bash
deno task start status
# or
git-commit-ai status
```

#### `model` (or `m`)

List all available AI models and providers:

```bash
git-commit-ai model
```

Providers with a configured API key are marked with `✓`. Use this command to find the correct `--model` value.

#### `version` (or `v`)

Show version information:

```bash
git-commit-ai version
```

### Direct Execution Examples

```bash
# Generate with specific model
deno run --allow-run --allow-env --allow-read --allow-write --allow-net src/cli.ts generate --model cerebras/llama-3.1-70b

# Dry run
deno run --allow-run --allow-env --allow-read --allow-write --allow-net src/cli.ts generate --dry-run

# Check status
deno run --allow-run --allow-env --allow-read --allow-write --allow-net src/cli.ts status
```

### Workflow Example

```bash
# 1. Make your changes
echo "console.log('Hello World');" > hello.ts

# 2. Stage changes
git add hello.ts

# 3. Check status
deno task start status

# 4. Generate commit message
deno task start generate

# Output:
# 📁 Files to be committed (1):
#   A hello.ts (added)
#
# 🤖 Analyzing changes with AI using model: cerebras/llama-3.1-70b...
# ✨ Generated Commit Message:
# "feat: add hello world console log"
#
# ✏️  Edit the commit message below (press Enter to commit, Ctrl+C twice to cancel):
# Commit message: feat: add hello world console log
# ✅ Successfully committed!
# Push changes to remote? (Y/n): n
```

## Conventional Commit Types

The AI automatically detects and uses these conventional commit types:

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

## Configuration

### Environment Variables

- `GIT_COMMIT_AI_MODEL` (optional): Default model to use (e.g., `cerebras/llama-3.1-70b`)
- `GIT_COMMIT_AI_TEMPERATURE` (optional): AI temperature from `0.0` to `1.0` (default: `0.3`)
- `GIT_COMMIT_AI_MAX_TOKENS` (optional): Maximum tokens for AI response (default: `200`)
- `GIT_COMMIT_AI_NO_PUSH` (optional): Set to `true` to skip push prompts by default
- `GIT_COMMIT_AI_CACHE_TTL` (optional): Cache TTL for models.dev data in seconds (default: `86400`)

**Provider API Keys:** Each provider requires its own API key. Set the appropriate environment variable for your chosen provider. Common examples include:

- `OPENROUTER_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `CEREBRAS_API_KEY`
- `MISTRAL_API_KEY`

Run `git-commit-ai model` to see which environment variable each provider requires.

### Config File

You can also configure the tool via a JSON config file at:

```
~/.config/git-commit-ai/config.json
```

Example:

```json
{
  "model": "cerebras/llama-3.1-70b",
  "temperature": 0.3,
  "maxTokens": 200,
  "providers": {
    "my-provider": {
      "api": "https://api.my-provider.com/v1",
      "env": ["MY_PROVIDER_API_KEY"],
      "models": {
        "my-model": {
          "name": "My Custom Model"
        }
      }
    }
  }
}
```

Configuration precedence (highest to lowest):

1. CLI flags (`--model`, `--temperature`, `--max-tokens`)
2. Environment variables
3. Config file (`~/.config/git-commit-ai/config.json`)
4. Built-in defaults

### Deno Configuration

The project uses `deno.json` for configuration. See the file in the repository for the full import map, tasks, and compiler options.

### Permissions

This app requires the following Deno permissions:

- `--allow-run`: Execute git commands
- `--allow-env`: Read environment variables
- `--allow-read`: Read config files and `.env`
- `--allow-write`: Write models.dev cache to `~/.cache/git-commit-ai/`
- `--allow-net`: Fetch model metadata and make AI API requests

## API Integration

This project uses:

- **[models.dev](https://models.dev)**: Open database of AI model capabilities and provider metadata
- **[AI SDK](https://sdk.vercel.ai)**: TypeScript library for building AI-powered applications
- **Bundled providers**: Anthropic, Cerebras, Mistral, OpenAI, OpenRouter, and OpenAI-compatible endpoints
- **Deno Standard Library**: Built-in utilities and formatting
- **Cliffy**: Modern CLI framework for Deno

## Project Structure

```
git-commit-ai/
├── src/
│   ├── cli.ts          # CLI entry point and command definitions
│   ├── ai.ts           # AI integration and prompt engineering
│   ├── git.ts          # Git operations and utilities
│   ├── models-dev.ts   # models.dev fetching, caching, and provider resolution
│   ├── config.ts       # Configuration loading and merging
│   ├── paths.ts        # XDG config/cache path resolution
│   ├── services.ts     # Dependency injection interfaces
│   ├── types.ts        # TypeScript type definitions
│   └── cmd/
│       ├── generate.ts # Generate commit message command
│       ├── model.ts    # Model management command
│       ├── status.ts   # Status check command
│       └── version.ts  # Version command
├── tests/
│   └── main_test.ts    # Main test suite
├── deno.json           # Deno configuration
├── .env.example        # Environment variables template
└── README.md           # This file
```

## Development

### Type Checking

```bash
deno task check
```

### Linting

```bash
deno task lint
```

### Formatting

```bash
deno task fmt
```

### Running Tests

```bash
deno task test
```

## Troubleshooting

### Common Issues

**"Not in a git repository"**

- Make sure you're in a git repository directory
- Run `git init` if needed

**"No staged changes found"**

- `generate` automatically stages all changes when nothing is staged
- If you prefer manual control, stage your changes first: `git add <files>`
- Check status: `git status`

**"No model specified" or API key errors**

- Set `GIT_COMMIT_AI_MODEL` in your `.env` or use `--model`
- Ensure the API key environment variable for your provider is set
- Run `git-commit-ai model` to verify provider availability

**"Permission denied"**

- Ensure you're running with proper Deno permissions:
  ```bash
  deno run --allow-run --allow-env --allow-read --allow-write --allow-net src/cli.ts
  ```

**"Failed to generate commit message"**

- Check your internet connection
- Verify your API key is correct and has sufficient quota
- Try again in a few moments

### Debug Mode

Use the `--debug` flag to see detailed output:

```bash
deno task start generate --debug
```

## Why Deno?

- **🚀 Fast startup**: No node_modules scanning
- **🔒 Secure by default**: Explicit permissions required
- **📦 Modern package management**: JSR and npm compatibility
- **✨ TypeScript native**: Built-in TypeScript support
- **🎯 Modern**: ES modules, Web APIs, and modern JavaScript features

## TODO

- [x] Allow provider/model to be provided via environment variable or command line argument
- [x] Allow model to be provided via environment variable, prioritize lower than command line argument
- [x] Ask if user wants to push to current tracking remote and branch
- [x] Add non-interactive flag `--commit` to auto-accept generated message without prompting
- [x] Be smarter about detecting deleted files/code, and not detect feature removal as implementation
- [x] Allow user to edit commit message before committing, with Ctrl+C to cancel

## Contributing

Feel free to contribute! Some ideas:

- Support for more AI providers
- Custom commit message templates
- Git hooks integration
- Batch processing for multiple commits
- Web UI interface

## Git Hooks (Lefthook)

This project uses [Lefthook](https://github.com/evilmartians/lefthook) for pre-commit hooks that
automatically format and lint code.

**Install Lefthook:**

```bash
# macOS/Linux (Homebrew)
brew install lefthook

# Go
go install github.com/evilmartians/lefthook@latest
```

**Setup after cloning:**

```bash
lefthook install
```

**Skip hooks (when needed):**

```bash
git commit --no-verify -m "message"
# or
LEFTHOOK=0 git commit -m "message"
```

## Credits

- Model metadata powered by [models.dev](https://models.dev) — an open database of AI model capabilities
- Built with [AI SDK](https://sdk.vercel.ai) — TypeScript/JavaScript library for building AI-powered applications

## License

MIT License - feel free to use this project however you'd like!

---

Author: Porawit Poboonma

Made with ❤️ using Deno and TypeScript
