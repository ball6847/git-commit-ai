# Git Commit AI 🤖

An AI-powered git commit message generator that follows conventional commit guidelines using TypeScript and Deno via OpenRouter.

## Features

- 🎯 **Conventional Commits**: Automatically generates standardized commit messages
- 🧠 **AI-Powered**: Uses AI for intelligent analysis
- 📁 **File Analysis**: Analyzes staged changes and file modifications
- 🎨 **Beautiful CLI**: Colorful and intuitive command-line interface
- 🔍 **Smart Detection**: Identifies the type of changes (feat, fix, docs, etc.)
- 🛡️ **Validation**: Ensures generated messages follow conventional commit format
- ⚡ **Deno Native**: Built with modern TypeScript and Deno runtime
- 🔒 **Secure**: No node_modules, URL-based imports, built-in permissions

## Prerequisites

- **Deno 1.40+**: [Install Deno](https://deno.land/manual/getting_started/installation)
- **Git**: Version control system
- **OpenRouter API Key**: [Get your key](https://openrouter.ai/)

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

3. **Add your OpenRouter API key to `.env`:**
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
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
deno run --allow-run --allow-env --allow-read src/cli.ts generate
```

### Available Tasks

```bash
# Start the CLI
deno task start

# Development with file watching
deno task dev

# Install locally for testing
deno task install:local
```

### Commands

#### `generate` (or `gen`)

Generate a conventional commit message for staged changes:

```bash
# Basic usage
deno task start generate

# Use different model
git-commit-ai generate --model meta-llama/llama-3.2-1b-instruct

# Dry run (generate without committing)
git-commit-ai generate --dry-run

# Debug mode
git-commit-ai generate --debug
```

**Smart Staging:** If you have no staged changes, `generate` will automatically stage all files for you. If you already staged some files, it will only generate a message for those staged files.

#### `status`

Show current git status and staged changes:

```bash
deno task start status
# or
git-commit-ai status
```

### Direct Execution Examples

```bash
# Generate with specific model
deno run --allow-run --allow-env --allow-read src/cli.ts generate --model meta-llama/llama-3.2-1b-instruct

# Dry run
deno run --allow-run --allow-env --allow-read src/cli.ts generate --dry-run

# Check status
deno run --allow-run --allow-env --allow-read src/cli.ts status
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
# 🤖 Analyzing changes with AI...
# ✨ Generated Commit Message:
# "feat: add hello world console log"
#
# Would you like to commit with this message? (y/N): y
# ✅ Successfully committed!
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

- `OPENROUTER_API_KEY` (required): Your OpenRouter API key
- `OPENROUTER_MODEL` (optional): Model to use (default: meta-llama/llama-3.2-3b-instruct)
- `DEBUG` (optional): Enable debug output

### Deno Configuration

The project uses `deno.json` for configuration:

```json
{
  "tasks": {
    "start": "deno run --allow-run --allow-env --allow-read src/cli.ts",
    "generate": "deno run --allow-run --allow-env --allow-read src/cli.ts generate"
  },
  "imports": {
    "@cliffy/command": "https://deno.land/x/cliffy@v1.0.0-rc.4/command/mod.ts",
    "@std/fmt": "https://deno.land/std@0.224.0/fmt/colors.ts"
  }
}
```

### Permissions

This app requires the following Deno permissions:

- `--allow-run`: Execute git commands
- `--allow-env`: Read environment variables
- `--allow-read`: Read .env files

## API Integration

This project uses:

- **[OpenRouter](https://openrouter.ai/)**: AI model access via HTTP API
- **AI Model**: The AI model for text generation
- **Deno Standard Library**: Built-in utilities and formatting
- **Cliffy**: Modern CLI framework for Deno

## Project Structure

```
git-commit-ai/
├── src/
│   ├── cli.ts          # Command-line interface
│   ├── ai.ts           # OpenRouter integration
│   ├── git.ts          # Git operations and utilities
│   └── types.ts        # TypeScript type definitions
├── deno.json           # Deno configuration
├── .env.example        # Environment variables template
└── README.md          # This file
```

## Development

### Type Checking

```bash
deno check src/cli.ts
```

### Linting

```bash
deno lint
```

### Formatting

```bash
deno fmt
```

### Running Tests

```bash
deno test --allow-run --allow-env --allow-read
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

**"OPENROUTER_API_KEY not found"**

- Copy `.env.example` to `.env`
- Add your OpenRouter API key

**"Permission denied"**

- Ensure you're running with proper Deno permissions:
  ```bash
  deno run --allow-run --allow-env --allow-read src/cli.ts
  ```

**"Failed to generate commit message"**

- Check your internet connection
- Verify your API key is correct
- Try again in a few moments

### Debug Mode

Use the `--debug` flag to see detailed output:

```bash
deno task start generate --debug
```

## Why Deno?

- **🚀 Fast startup**: No node_modules scanning
- **🔒 Secure by default**: Explicit permissions required
- **📦 No package.json**: Direct URL imports
- **✨ TypeScript native**: Built-in TypeScript support
- **🎯 Modern**: ES modules, Web APIs, and modern JavaScript features

## TODO

- [ ] Allow OpenRouter provider to be provided via environment variable or command line argument
- [x] Allow OpenRouter model to be provided via environment variable, prioritize lower than command line argument
- [x] Ask if user wants to push to current tracking remote and branch, default to No
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
