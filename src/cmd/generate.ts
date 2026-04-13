import { displayCommitMessage, generateCommitMessage } from '../ai.ts';
import { displayChangeSummary, getChangeSummary, getStagedDiff, isGitRepository } from '../git.ts';
import { Confirm, Input } from '@cliffy/prompt';
import type { AIConfig, CustomProviderConfig } from '../types.ts';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { mergeConfig } from '../config.ts';
import { ENV } from '../cli.ts';

export interface GenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  debug?: boolean;
  dryRun?: boolean;
  commit?: boolean;
  push?: boolean;
  noPush?: boolean;
  message?: string;
}

export async function handleGenerate(options: GenerateOptions) {
  try {
    // Setup signal handlers for graceful cancellation
    setupSignalHandlers();

    // Print header
    console.log(
      cyan(bold('\n🚀 Git Commit AI - Conventional Commit Generator\n')),
    );

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
      console.log(
        red(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      if (
        error instanceof Error &&
        error.message.includes('No staged changes')
      ) {
        console.log(
          yellow('💡 Tip: Use "git add <files>" to stage your changes first.'),
        );
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
        red(
          '❌ Error: No model specified. Please provide a model using the --model option or set GIT_COMMIT_AI_MODEL environment variable.',
        ),
      );
      Deno.exit(1);
    }

    const envVars = {
      model: Deno.env.get('GIT_COMMIT_AI_MODEL'),
      temperature: Deno.env.get('GIT_COMMIT_AI_TEMPERATURE')
        ? Number(Deno.env.get('GIT_COMMIT_AI_TEMPERATURE'))
        : undefined,
      maxTokens: Deno.env.get('GIT_COMMIT_AI_MAX_TOKENS')
        ? Number(Deno.env.get('GIT_COMMIT_AI_MAX_TOKENS'))
        : undefined,
      thinkingEffort: undefined as string | undefined,
    };

    const defaults = {
      model: ENV.model,
      maxTokens: ENV.maxTokens,
      temperature: ENV.temperature,
      thinkingEffort: ENV.thinkingEffort,
      providers: ENV.providers as Record<string, CustomProviderConfig>,
    };

    const aiConfig: AIConfig = mergeConfig(
      { model: options.model, temperature: options.temperature, maxTokens: options.maxTokens },
      envVars,
      undefined,
      defaults,
    );

    // Generate commit message
    let commitMessage: string;
    try {
      commitMessage = await generateCommitMessage(
        aiConfig,
        diff,
        changeSummary,
        options.message,
      );
    } catch (error) {
      console.log(
        red(
          `❌ AI Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
      console.log(
        yellow('💡 Please check your API key and internet connection.'),
      );
      Deno.exit(1);
    }

    // Display generated message
    displayCommitMessage(commitMessage);

    if (options.dryRun) {
      const ignoredFlags: string[] = [];
      if (options.commit) ignoredFlags.push('--commit');
      if (options.push) ignoredFlags.push('--push');
      if (ignoredFlags.length > 0) {
        console.log(
          yellow(`⚠️  --dry-run is active: ignoring ${ignoredFlags.join(' and ')} flags`),
        );
      }
      console.log(
        blue('🏃 Dry run completed. Use without --dry-run to commit.'),
      );
      Deno.exit(0);
    }

    // Auto-accept generated message if --commit is set, otherwise prompt user
    let finalMessage: string;
    if (options.commit) {
      finalMessage = commitMessage;
      console.log(green('✅ Using --commit - auto-accepting commit'));
    } else {
      const result = await promptForCommitMessage(commitMessage);
      finalMessage = result ?? '';
      if (finalMessage === '') {
        console.log(blue('📋 Commit cancelled.'));
        Deno.exit(0);
      }
    }

    commitChanges(finalMessage);

    // Push decision: --push overrides --no-push and env var
    if (options.push) {
      if (options.noPush) {
        console.log(yellow('⚠️  --push overrides --no-push.'));
      }
      await pushChanges(true);
    } else if (options.noPush || Deno.env.get('GIT_COMMIT_AI_NO_PUSH') === 'true') {
      console.log(blue('📋 Push skipped (--no-push).'));
    } else {
      await pushChanges(false);
    }
  } catch (error) {
    console.log(
      red(
        `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    if (options.debug && error instanceof Error) {
      console.log(yellow(error.stack || 'No stack trace available'));
    }
    Deno.exit(1);
  }
}

/**
 * Setup signal handlers for graceful cancellation
 */
function setupSignalHandlers(): void {
  let ctrlCCount = 0;

  Deno.addSignalListener('SIGINT', () => {
    ctrlCCount++;
    if (ctrlCCount === 1) {
      console.log(
        yellow('\n⚠️  Press Ctrl+C again to cancel without committing...'),
      );
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
async function promptForCommitMessage(
  generatedMessage: string,
): Promise<string | null> {
  try {
    console.log(
      green(
        '✏️  Edit the commit message below (press Enter to commit, Ctrl+C twice to cancel):',
      ),
    );
    console.log(
      yellow('💡 Tip: You can modify the message before pressing Enter\n'),
    );

    const finalMessage = await Input.prompt({
      message: 'Commit message:',
      default: generatedMessage,
      suggestions: [generatedMessage],
    });

    return finalMessage?.trim() ?? '';
  } catch (_error) {
    return null;
  }
}

async function pushChanges(autoPush: boolean): Promise<void> {
  if (autoPush) {
    console.log(green('✅ Using --push - auto-accepting push'));
    const command = new Deno.Command('git', {
      args: ['push'],
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const { success: pushSuccess } = command.outputSync();

    if (pushSuccess) {
      console.log(green('🚀 Successfully pushed changes!'));
    } else {
      console.log(red('❌ Push failed'));
      Deno.exit(1);
    }
    return;
  }

  const shouldPush = await Confirm.prompt({
    message: 'Push changes to remote?',
    default: true,
  });

  if (!shouldPush) {
    console.log(blue('📋 Push cancelled.'));
    Deno.exit(0);
  }

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
      red(
        `❌ Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    Deno.exit(1);
  }
}
