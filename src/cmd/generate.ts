import { displayCommitMessage, generateCommitMessage as aiGenerateCommitMessage } from '../ai.ts';
import { displayChangeSummary, getChangeSummary, getStagedDiff, isGitRepository } from '../git.ts';
import { Confirm, Input } from '@cliffy/prompt';
import type { AIConfig, CustomProviderConfig } from '../types.ts';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { mergeConfig } from '../config.ts';
import { ENV } from '../cli.ts';

export interface GenerateDependencies {
  generateCommitMessage?: typeof aiGenerateCommitMessage;
  logger?: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}

type DepsLogger = NonNullable<GenerateDependencies['logger']>;

const defaultDeps: Required<GenerateDependencies> = {
  generateCommitMessage: aiGenerateCommitMessage,
  logger: globalThis.console,
};

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

export async function handleGenerate(
  options: GenerateOptions,
  deps: GenerateDependencies = {},
): Promise<void> {
  const { generateCommitMessage = defaultDeps.generateCommitMessage, logger = defaultDeps.logger } =
    deps;

  try {
    setupSignalHandlers(logger);

    logger.log(
      cyan(bold('\n🚀 Git Commit AI - Conventional Commit Generator\n')),
    );

    if (!isGitRepository()) {
      logger.log(red('❌ Error: Not in a git repository.'));
      Deno.exit(1);
    }

    let diff = '';
    let changeSummary;
    try {
      changeSummary = getChangeSummary();
      if (!changeSummary.allDeletions) {
        diff = getStagedDiff();
      }
    } catch (error) {
      logger.log(
        red(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      if (
        error instanceof Error &&
        error.message.includes('No staged changes')
      ) {
        logger.log(
          yellow('💡 Tip: Use "git add <files>" to stage your changes first.'),
        );
      }
      Deno.exit(1);
    }

    displayChangeSummary(changeSummary);

    if (options.debug) {
      logger.log(yellow('Debug: Git diff preview:'));
      logger.log(yellow(diff.substring(0, 500) + '...'));
      logger.log(yellow(`Debug: Using model: ${options.model}`));
      logger.log();
    }

    if (!options.model) {
      logger.log(
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

    let commitMessage: string;
    try {
      commitMessage = await generateCommitMessage(
        aiConfig,
        diff,
        changeSummary,
        options.message,
      );
    } catch (error) {
      logger.log(
        red(
          `❌ AI Generation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
      );
      logger.log(
        yellow('💡 Please check your API key and internet connection.'),
      );
      Deno.exit(1);
    }

    displayCommitMessage(commitMessage);

    if (options.dryRun) {
      const ignoredFlags: string[] = [];
      if (options.commit) ignoredFlags.push('--commit');
      if (options.push) ignoredFlags.push('--push');
      if (ignoredFlags.length > 0) {
        logger.log(
          yellow(`⚠️  --dry-run is active: ignoring ${ignoredFlags.join(' and ')} flags`),
        );
      }
      logger.log(
        blue('🏃 Dry run completed. Use without --dry-run to commit.'),
      );
      Deno.exit(0);
    }

    let finalMessage: string;
    if (options.commit) {
      finalMessage = commitMessage;
      logger.log(green('✅ Using --commit - auto-accepting commit'));
    } else {
      const result = await promptForCommitMessage(commitMessage, logger);
      finalMessage = result ?? '';
      if (finalMessage === '') {
        logger.log(blue('📋 Commit cancelled.'));
        Deno.exit(0);
      }
    }

    commitChanges(finalMessage, logger);

    if (options.push) {
      if (options.noPush) {
        logger.log(yellow('⚠️  --push overrides --no-push.'));
      }
      await pushChanges(true, logger);
    } else if (options.noPush || Deno.env.get('GIT_COMMIT_AI_NO_PUSH') === 'true') {
      logger.log(blue('📋 Push skipped (--no-push).'));
    } else {
      await pushChanges(false, logger);
    }
  } catch (error) {
    logger.log(
      red(
        `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    if (options.debug && error instanceof Error) {
      logger.log(yellow(error.stack || 'No stack trace available'));
    }
    Deno.exit(1);
  }
}

function setupSignalHandlers(logger: DepsLogger): void {
  let ctrlCCount = 0;

  Deno.addSignalListener('SIGINT', () => {
    ctrlCCount++;
    if (ctrlCCount === 1) {
      logger.log(
        yellow('\n⚠️  Press Ctrl+C again to cancel without committing...'),
      );
    } else {
      logger.log(blue('\n📋 Operation cancelled. No commit was made.'));
      Deno.exit(0);
    }

    setTimeout(() => {
      ctrlCCount = 0;
    }, 3000);
  });
}

async function promptForCommitMessage(
  generatedMessage: string,
  logger: DepsLogger,
): Promise<string | null> {
  try {
    logger.log(
      green(
        '✏️  Edit the commit message below (press Enter to commit, Ctrl+C twice to cancel):',
      ),
    );
    logger.log(
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

async function pushChanges(autoPush: boolean, logger: DepsLogger): Promise<void> {
  if (autoPush) {
    logger.log(green('✅ Using --push - auto-accepting push'));
    const command = new Deno.Command('git', {
      args: ['push'],
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const { success: pushSuccess } = command.outputSync();

    if (pushSuccess) {
      logger.log(green('🚀 Successfully pushed changes!'));
    } else {
      logger.log(red('❌ Push failed'));
      Deno.exit(1);
    }
    return;
  }

  const shouldPush = await Confirm.prompt({
    message: 'Push changes to remote?',
    default: true,
  });

  if (!shouldPush) {
    logger.log(blue('📋 Push cancelled.'));
    Deno.exit(0);
  }

  const pushCommand = new Deno.Command('git', {
    args: ['push'],
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const { success: pushSuccess } = pushCommand.outputSync();

  if (pushSuccess) {
    logger.log(green('🚀 Successfully pushed changes!'));
  } else {
    logger.log(red('❌ Push failed'));
    Deno.exit(1);
  }
}

function commitChanges(commitMessage: string, logger: DepsLogger): void {
  try {
    const command = new Deno.Command('git', {
      args: ['commit', '-m', commitMessage],
      stdout: 'inherit',
      stderr: 'inherit',
    });

    const { success } = command.outputSync();

    if (success) {
      logger.log(green('✅ Successfully committed!'));
    } else {
      logger.log(red('❌ Commit failed'));
      Deno.exit(1);
    }
  } catch (error) {
    logger.log(
      red(
        `❌ Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    Deno.exit(1);
  }
}
