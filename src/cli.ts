#!/usr/bin/env -S deno run --allow-run --allow-env --allow-read

import { Command } from '@cliffy/command';
import { load } from '@std/dotenv';
import { red } from '@std/fmt/colors';
import { Result } from 'typescript-result';

import { handleGenerate } from './cmd/generate.ts';
import { handleModel } from './cmd/model.ts';
import { handleStatus } from './cmd/status.ts';
import { handleVersion } from './cmd/version.ts';
import { mergeConfig } from './config.ts';

// Load environment variables
await load({ export: true });

const VERSION = '0.2.0';

function loadConfigAtStartup(): {
  model: string;
  maxTokens: number;
  temperature: number;
  thinkingEffort?: 'low' | 'medium' | 'high';
  providers: Record<string, unknown>;
} {
  const cliOptions = {} as {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };

  const defaultConfig = {
    model: '',
    maxTokens: 200,
    temperature: 0.3,
    providers: {},
  };

  return mergeConfig(
    cliOptions,
    {
      model: Deno.env.get('GIT_COMMIT_AI_MODEL'),
      temperature: Deno.env.get('GIT_COMMIT_AI_TEMPERATURE')
        ? Number(Deno.env.get('GIT_COMMIT_AI_TEMPERATURE'))
        : undefined,
      maxTokens: Deno.env.get('GIT_COMMIT_AI_MAX_TOKENS')
        ? Number(Deno.env.get('GIT_COMMIT_AI_MAX_TOKENS'))
        : undefined,
    },
    undefined,
    defaultConfig,
  );
}

const ENV = await loadConfigAtStartup();

export { ENV };

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
  .option('--commit', 'Auto-accept generated message without prompting')
  .option('-p, --push', 'Auto-accept push to remote without prompting')
  .option('--no-push', 'Skip push step entirely (overridden by --push)')
  .action(handleGenerate);

// Add version command
cli
  .command('version', 'Show version information')
  .alias('v')
  .action(() => handleVersion());

// Add model command
cli
  .command('model', 'List all available AI models')
  .alias('m')
  .action(() => handleModel());

// Add status command
cli
  .command('status', 'Show current git status and staged changes')
  .alias('s')
  .action(() => handleStatus());

// Handle main execution
if (import.meta.main) {
  const parseResult = await Result.wrap(() => cli.parse(Deno.args))();
  if (!parseResult.ok) {
    const error = parseResult.error;
    console.log(
      red('❌ CLI Error:'),
      error instanceof Error ? error.message : 'Unknown error',
    );
    Deno.exit(1);
  }
}
