#!/usr/bin/env -S deno run --allow-run --allow-env --allow-read

import { Command } from '@cliffy/command';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { load } from '@std/dotenv';

// Load environment variables
await load({ export: true });

// Import our modules
import { displayChangeSummary, getChangeSummary, getStagedDiff, isGitRepository } from './git.ts';
import { displayCommitMessage, generateCommitMessage, initializeAI } from './ai.ts';
import type { CLIOptions } from './types.ts';

const DEFAULT_MODEL = 'mistralai/mistral-7b-instruct:free';

/**
 * Ask user for confirmation
 * @param question - The question to ask the user
 * @param defaultValue - The default value to return if user doesn't provide an answer
 *                      (true for 'y'/'yes', false for 'n'/'no')
 */
async function askForConfirmation(
  question: string,
  defaultValue: boolean = false,
): Promise<boolean> {
  const input = prompt(question);
  if (input === '' || input === null) {
    return defaultValue;
  }
  return input.toLowerCase() === 'y' || input.toLowerCase() === 'yes';
}

/**
 * Commit changes with the generated message
 */
function commitChanges(commitMessage: string): void {
  try {
    const command = new Deno.Command('git', {
      args: ['commit', '-m', commitMessage],
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const { success } = command.outputSync();

    if (success) {
      console.log(green('✅ Successfully committed!'));
    } else {
      console.log(red('❌ Commit failed'));
      Deno.exit(1);
    }
  } catch (error) {
    console.log(
      red(`❌ Commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`),
    );
    Deno.exit(1);
  }
}

/**
 * Generate command handler
 */
async function generateHandler(options: CLIOptions): Promise<void> {
  try {
    // Print header
    console.log(cyan(bold('\n🚀 Git Commit AI - Conventional Commit Generator\n')));

    // Check if we're in a git repository
    if (!isGitRepository()) {
      console.log(red('❌ Error: Not in a git repository.'));
      Deno.exit(1);
    }

    // Check for API key
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      console.log(red('❌ Error: OPENROUTER_API_KEY not found.'));
      console.log(yellow('Please copy .env.example to .env and add your OpenRouter API key.'));
      Deno.exit(1);
    }

    // Get staged changes
    let diff: string;
    let changeSummary;
    try {
      diff = getStagedDiff();
      changeSummary = getChangeSummary();
    } catch (error) {
      console.log(red(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`));
      if (error instanceof Error && error.message.includes('No staged changes')) {
        console.log(yellow('💡 Tip: Use "git add <files>" to stage your changes first.'));
      }
      Deno.exit(1);
    }

    // Display change summary
    displayChangeSummary(changeSummary);

    if (options.debug) {
      console.log(yellow('Debug: Git diff preview:'));
      console.log(yellow(diff.substring(0, 500) + '...'));
      console.log();
    }

    if (!options.model) {
      console.log(
        red('❌ Error: No model specified. Please provide a model using the --model option.'),
      );
      Deno.exit(1);
    }

    // Initialize AI
    let aiConfig;
    try {
      aiConfig = initializeAI(apiKey, options.model);
    } catch (error) {
      console.log(
        red(
          `❌ AI Initialization Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
      Deno.exit(1);
    }

    // Generate commit message
    let commitMessage: string;
    try {
      commitMessage = await generateCommitMessage(aiConfig, diff, changeSummary);
    } catch (error) {
      console.log(
        red(`❌ AI Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      console.log(yellow('💡 Please check your API key and internet connection.'));
      Deno.exit(1);
    }

    // Display generated message
    displayCommitMessage(commitMessage);

    if (options.dryRun) {
      console.log(blue('🏃 Dry run completed. Use without --dry-run to commit.'));
      Deno.exit(0);
    }

    // Ask for confirmation before committing.
    // Default to 'Yes' if no answer is provided
    const shouldCommit = await askForConfirmation(
      yellow('Would you like to commit with this message? (Y/n): '),
      true,
    );

    if (shouldCommit) {
      commitChanges(commitMessage);
    } else {
      console.log(blue('📋 Commit cancelled. You can copy the message above if needed.'));
    }
  } catch (error) {
    console.log(
      red(`❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`),
    );
    if (options.debug && error instanceof Error) {
      console.log(yellow(error.stack || 'No stack trace available'));
    }
    Deno.exit(1);
  }
}

/**
 * Status command handler
 */
function statusHandler(): void {
  try {
    if (!isGitRepository()) {
      console.log(red('❌ Not in a git repository.'));
      Deno.exit(1);
    }

    const changeSummary = getChangeSummary();
    console.log(cyan(bold('\n📊 Git Status Summary\n')));
    displayChangeSummary(changeSummary);

    if (changeSummary.totalFiles === 0) {
      console.log(blue('💡 Stage some changes with "git add" to generate a commit message.'));
    } else {
      console.log(
        green(`Ready to generate commit message for ${changeSummary.totalFiles} file(s).`),
      );
      console.log(blue('Run "git-commit-ai generate" to create a commit message.'));
    }
  } catch (error) {
    console.log(red(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
    Deno.exit(1);
  }
}

// Create CLI application
const cli = new Command()
  .name('git-commit-ai')
  .version('1.0.0')
  .description('AI-powered git commit message generator using conventional commit guidelines')
  .default('generate');

// Generate command
cli.command('generate', 'Generate a conventional commit message for staged changes')
  .alias('gen')
  .alias('g')
  .option('-m, --model <model:string>', 'OpenRouter model to use', {
    default: DEFAULT_MODEL,
  })
  .option('-d, --debug', 'Enable debug output')
  .option('--dry-run', 'Generate message without committing')
  .action(async (options: CLIOptions) => {
    // Ensure the model option has a default value
    if (!options.model) {
      options.model = DEFAULT_MODEL;
    }
    await generateHandler(options);
  });

// Status command
cli.command('status', 'Show current git status and staged changes')
  .alias('s')
  .action(() => {
    statusHandler();
  });

// Handle main execution
if (import.meta.main) {
  try {
    await cli.parse(Deno.args);
  } catch (error) {
    console.log(red('❌ CLI Error:'), error instanceof Error ? error.message : 'Unknown error');
    Deno.exit(1);
  }
}
