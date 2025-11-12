#!/usr/bin/env -S deno run --allow-run --allow-env --allow-read

import { Command } from '@cliffy/command';
import { Confirm, Input } from '@cliffy/prompt';
import { load } from '@std/dotenv';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { displayCommitMessage, generateCommitMessage, initializeAI } from './ai.ts';
import { displayChangeSummary, getChangeSummary, getStagedDiff, isGitRepository } from './git.ts';
import type { CLIOptions } from './types.ts';
import { modelKeys } from './providers/index.ts';

// Load environment variables
await load({ export: true });

const VERSION = '0.0.2';
const DEFAULT_MODEL = 'cerebras/llama-3.1-70b';

/**
 * Setup signal handlers for graceful cancellation
 */
function setupSignalHandlers(): void {
  let ctrlCCount = 0;

  Deno.addSignalListener('SIGINT', () => {
    ctrlCCount++;
    if (ctrlCCount === 1) {
      console.log(yellow('\n⚠️  Press Ctrl+C again to cancel without committing...'));
    } else {
      console.log(blue('\n📋 Operation cancelled. No commit was made.'));
      Deno.exit(0);
    }

    // Reset counter after 3 seconds
    setTimeout(() => {
      ctrlCCount = 0;
    }, 3000);
  });
}

/**
 * Prompt user to edit the commit message
 */
async function promptForCommitMessage(generatedMessage: string): Promise<string | null> {
  try {
    console.log(
      green('✏️  Edit the commit message below (press Enter to commit, Ctrl+C twice to cancel):'),
    );
    console.log(yellow('💡 Tip: You can modify the message before pressing Enter\n'));

    const finalMessage = await Input.prompt({
      message: 'Commit message:',
      default: generatedMessage,
      suggestions: [generatedMessage],
    });

    return finalMessage.trim();
  } catch (_error) {
    // User pressed Ctrl+C during input
    return null;
  }
}

async function pushChanges(options?: CLIOptions): Promise<void> {
  // Determine if we should push (either via flag or confirmation)
  const shouldPush = options?.push || await Confirm.prompt({
    message: 'Push changes to remote?',
    default: true,
  });

  if (!shouldPush) {
    console.log(blue('📋 Push cancelled.'));
    Deno.exit(0);
  }

  // Execute git push
  const pushCommand = new Deno.Command('git', {
    args: ['push'],
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const { success: pushSuccess } = pushCommand.outputSync();

  if (pushSuccess) {
    console.log(green('🚀 Successfully pushed changes!'));
  } else {
    console.log(red('❌ Push failed'));
    Deno.exit(1);
  }
}

async function commitChanges(commitMessage: string): Promise<void> {
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
      red(`❌ Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`),
    );
    Deno.exit(1);
  }
}

/**
 * Generate command handler
 */
async function generateHandler(options: CLIOptions): Promise<void> {
  try {
    // Setup signal handlers for graceful cancellation
    setupSignalHandlers();

    // Print header
    console.log(cyan(bold('\n🚀 Git Commit AI - Conventional Commit Generator\n')));

    // Check if we're in a git repository
    if (!isGitRepository()) {
      console.log(red('❌ Error: Not in a git repository.'));
      Deno.exit(1);
    }

    // Get staged changes
    let diff = '';
    let changeSummary;
    try {
      changeSummary = getChangeSummary();
      if (!changeSummary.allDeletions) {
        diff = getStagedDiff();
      }
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
      console.log(yellow(`Debug: Using model: ${options.model}`));
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
      aiConfig = initializeAI(options.model);
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

    // Handle auto-accept or prompt for confirmation
    let finalMessage: string = commitMessage;
    if (!options.yes) {
      const promptedMessage = await promptForCommitMessage(commitMessage);

      if (!promptedMessage) {
        console.log(blue('📋 Commit cancelled. No commit was made.'));
        Deno.exit(0);
      }

      if (promptedMessage.trim() === '') {
        console.log(red('❌ Empty commit message. Commit cancelled.'));
        Deno.exit(1);
      }

      finalMessage = promptedMessage;
    }

    // Commit changes with the final message
    await commitChanges(finalMessage);

    // Push changes if commit was successful
    await pushChanges(options);
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
 * Model command handler
 */
function modelHandler(): void {
  console.log(cyan(bold('\n🤖 Available AI Models\n')));

  if (modelKeys.length < 1) {
    console.log(yellow('No models configured.'));
    return;
  }

  console.log(green('Supported model keys:'));
  modelKeys.forEach((key, index) => {
    console.log(`  ${index + 1}. ${key}`);
  });

  console.log();
  console.log(yellow('Usage:'));
  console.log('  Set environment variable: export GIT_COMMIT_AI_MODEL=<model-key>');
  console.log('  Or use command line option: git-commit-ai generate --model <model-key>');
  console.log();
  console.log(blue(`Current model: ${Deno.env.get('GIT_COMMIT_AI_MODEL') || DEFAULT_MODEL}`));
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
  .version(VERSION)
  .description('AI-powered git commit message generator using conventional commit guidelines')
  .default('generate');

// Generate command
cli.command('generate', 'Generate a conventional commit message for staged changes')
  .alias('gen')
  .alias('g')
  .option('-m, --model <model:string>', 'AI model to use (overrides GIT_COMMIT_AI_MODEL)', {
    default: Deno.env.get('GIT_COMMIT_AI_MODEL') || DEFAULT_MODEL,
  })
  .option('-d, --debug', 'Enable debug output')
  .option('--dry-run', 'Generate message without committing')
  .option('-y, --yes', 'Auto-accept generated message without prompting')
  .option('-p, --push', 'Push changes to remote after commit')
  .action(async (options: CLIOptions) => {
    // Ensure the model option has a default value
    if (!options.model) {
      options.model = DEFAULT_MODEL;
    }
    await generateHandler(options);
  });

// Model command
cli.command('model', 'List all available AI models')
  .alias('m')
  .action(() => {
    modelHandler();
  });

// Status command
cli
  .command('status', 'Show current git status and staged changes')
  .alias('s')
  .action(() => {
    statusHandler();
  });

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
