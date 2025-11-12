#!/usr/bin/env -S deno run --allow-run --allow-env --allow-read

import { Command } from '@cliffy/command';
import { load } from '@std/dotenv';
import { red } from '@std/fmt/colors';

import { handleGenerate } from './cmd/generate.ts';
import { handleCommit } from './cmd/commit.ts';
import { handleModel } from './cmd/model.ts';
import { handleStatus } from './cmd/status.ts';
import { handleVersion } from './cmd/version.ts';

// Load environment variables
await load({ export: true });

const VERSION = '0.1.0';

// Create CLI application
const cli = new Command()
  .name('git-commit-ai')
  .version(VERSION)
  .description(
    'AI-powered git commit message generator using conventional commit guidelines',
  );

// Add generate command
cli
  .command(
    'generate',
    'Generate a conventional commit message for staged changes',
  )
  .alias('gen')
  .alias('g')
  .option('-m, --model <model:string>', 'AI model to use')
  .option('--max-tokens <maxTokens:number>', 'Maximum tokens for AI response')
  .option('--temperature <temperature:number>', 'AI temperature (0.0-1.0)')
  .option('-d, --debug', 'Enable debug output')
  .option('--dry-run', 'Generate message without committing')
  .option('-y, --yes', 'Auto-accept generated message without prompting')
  .option('-p, --push', 'Push changes to remote after commit')
  .action(handleGenerate);

// Add version command
cli
  .command('version', 'Show version information')
  .alias('v')
  .action(handleVersion);

// Add commit command
cli
  .command('commit', 'Generate and commit changes with AI')
  .alias('c')
  .option('-m, --model <model:string>', 'AI model to use')
  .option('-p, --provider <provider:string>', 'AI provider to use')
  .option('--staged', 'Only commit staged changes (default: stage all)')
  .option('-d, --debug', 'Enable debug output')
  .action(handleCommit);

// Add model command
cli
  .command('model', 'List all available AI models')
  .alias('m')
  .action(handleModel);

// Add status command
cli
  .command('status', 'Show current git status and staged changes')
  .alias('s')
  .action(handleStatus);

// Handle main execution
if (import.meta.main) {
  try {
    await cli.parse(Deno.args);
  } catch (error) {
    console.log(
      red('❌ CLI Error:'),
      error instanceof Error ? error.message : 'Unknown error',
    );
    Deno.exit(1);
  }
}
