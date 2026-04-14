import { displayCommitMessage, generateCommitMessage as aiGenerateCommitMessage } from '../ai.ts';
import { displayChangeSummary, getChangeSummary, getStagedDiff, isGitRepository } from '../git.ts';
import { Confirm, Input } from '@cliffy/prompt';
import type { AIConfig, ChangeSummary, CustomProviderConfig } from '../types.ts';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { loadConfig, mergeConfig } from '../config.ts';
import { ENV } from '../cli.ts';

export class ProcessExitError extends Error {
  constructor(public code: number) {
    super(`Process exited with code ${code}`);
  }
}

export interface GenerateDependencies {
  generateCommitMessage?: typeof aiGenerateCommitMessage;
  isGitRepository?: typeof isGitRepository;
  getChangeSummary?: typeof getChangeSummary;
  getStagedDiff?: typeof getStagedDiff;
  stageAllChanges?: (cwd?: string) => Promise<boolean>;
  cwd?: string;
  setupSignalHandlers?: boolean;
  logger?: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  exit?: (code?: number) => never;
}

type DepsLogger = NonNullable<GenerateDependencies['logger']>;
type DepsExit = NonNullable<GenerateDependencies['exit']>;

const defaultDeps: Required<Omit<GenerateDependencies, 'cwd'>> & { cwd: string | undefined } = {
  generateCommitMessage: aiGenerateCommitMessage,
  isGitRepository,
  getChangeSummary,
  getStagedDiff,
  stageAllChanges: async (cwd?: string): Promise<boolean> => {
    const { success } = await new Deno.Command('git', {
      args: ['add', '.'],
      stdout: 'inherit',
      stderr: 'inherit',
      cwd,
    }).output();
    return success;
  },
  cwd: undefined,
  setupSignalHandlers: true,
  logger: globalThis.console,
  exit: Deno.exit,
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
}

export async function handleGenerate(
  options: GenerateOptions,
  deps: GenerateDependencies = {},
): Promise<void> {
  const {
    generateCommitMessage = defaultDeps.generateCommitMessage,
    isGitRepository: checkGitRepo = defaultDeps.isGitRepository,
    getChangeSummary: getSummary = defaultDeps.getChangeSummary,
    getStagedDiff: getDiff = defaultDeps.getStagedDiff,
    stageAllChanges = defaultDeps.stageAllChanges,
    cwd = defaultDeps.cwd,
    setupSignalHandlers: shouldSetupSignalHandlers = defaultDeps.setupSignalHandlers,
    logger = defaultDeps.logger,
    exit = defaultDeps.exit,
  } = deps;

  try {
    if (shouldSetupSignalHandlers) {
      setupSignalHandlers(logger);
    }

    logger.log(
      cyan(bold('\n🚀 Git Commit AI - Conventional Commit Generator\n')),
    );

    if (!checkGitRepo(cwd)) {
      logger.log(red('❌ Error: Not in a git repository.'));
      exit(1);
    }

    let diff = '';
    let changeSummary: ChangeSummary = { files: [], totalFiles: 0, allDeletions: false };
    try {
      changeSummary = getSummary(cwd);
      if (!changeSummary.allDeletions) {
        diff = getDiff(cwd);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('No staged changes')
      ) {
        logger.log(cyan('📝 No staged changes found. Staging all changes...'));
        const success = await stageAllChanges(cwd);
        if (!success) {
          logger.log(red('❌ Failed to stage changes'));
          exit(1);
        }
        try {
          changeSummary = getSummary(cwd);
          if (!changeSummary.allDeletions) {
            diff = getDiff(cwd);
          }
        } catch (retryError) {
          if (
            retryError instanceof Error &&
            retryError.message.includes('No staged changes')
          ) {
            logger.log(cyan('No changes to commit.'));
            exit(0);
          }
          logger.log(
            red(`❌ ${retryError instanceof Error ? retryError.message : 'Unknown error'}`),
          );
          exit(1);
        }
      } else {
        logger.log(
          red(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
        exit(1);
      }
    }

    displayChangeSummary(changeSummary);

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

    const configFileResult = await loadConfig();
    const configFile = configFileResult.ok ? configFileResult.value : undefined;

    const aiConfig: AIConfig = mergeConfig(
      { model: options.model, temperature: options.temperature, maxTokens: options.maxTokens },
      envVars,
      configFile,
      defaults,
    );

    if (options.debug) {
      logger.log(yellow('Debug: Git diff preview:'));
      logger.log(yellow(diff.substring(0, 500) + '...'));
      logger.log(yellow(`Debug: Using model: ${aiConfig.model}`));
      logger.log();
    }

    if (!aiConfig.model) {
      logger.log(
        red(
          '❌ Error: No model specified. Please provide a model using the --model option, set GIT_COMMIT_AI_MODEL environment variable, or add "model" to your config file.',
        ),
      );
      exit(1);
    }

    let commitMessage = '';
    try {
      commitMessage = await generateCommitMessage(
        aiConfig,
        diff,
        changeSummary,
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
      exit(1);
    }

    displayCommitMessage(commitMessage);

    if (options.dryRun) {
      const ignoredFlags: string[] = [];
      if (options.commit) {
        ignoredFlags.push('--commit');
      }
      if (options.push) {
        ignoredFlags.push('--push');
      }
      if (ignoredFlags.length > 0) {
        logger.log(
          yellow(`⚠️  --dry-run is active: ignoring ${ignoredFlags.join(' and ')} flags`),
        );
      }
      logger.log(
        blue('🏃 Dry run completed. Use without --dry-run to commit.'),
      );
      exit(0);
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
        exit(0);
      }
    }

    commitChanges(finalMessage, logger, exit, cwd);

    if (options.push) {
      if (options.noPush) {
        logger.log(yellow('⚠️  --push overrides --no-push.'));
      }
      await pushChanges(true, logger, exit, cwd);
    } else if (options.noPush || Deno.env.get('GIT_COMMIT_AI_NO_PUSH') === 'true') {
      logger.log(blue('📋 Push skipped (--no-push).'));
    } else {
      await pushChanges(false, logger, exit, cwd);
    }
  } catch (error) {
    if (error instanceof ProcessExitError) {
      throw error;
    }
    logger.log(
      red(
        `❌ Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    if (options.debug && error instanceof Error) {
      logger.log(yellow(error.stack || 'No stack trace available'));
    }
    exit(1);
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

async function pushChanges(
  autoPush: boolean,
  logger: DepsLogger,
  exit: DepsExit,
  cwd?: string,
): Promise<void> {
  if (autoPush) {
    logger.log(green('✅ Using --push - auto-accepting push'));
    const command = new Deno.Command('git', {
      args: ['push'],
      stdout: 'inherit',
      stderr: 'inherit',
      cwd,
    });

    const { success: pushSuccess } = command.outputSync();

    if (pushSuccess) {
      logger.log(green('🚀 Successfully pushed changes!'));
    } else {
      logger.log(red('❌ Push failed'));
      exit(1);
    }
    return;
  }

  const shouldPush = await Confirm.prompt({
    message: 'Push changes to remote?',
    default: true,
  });

  if (!shouldPush) {
    logger.log(blue('📋 Push cancelled.'));
    exit(0);
  }

  const pushCommand = new Deno.Command('git', {
    args: ['push'],
    stdout: 'inherit',
    stderr: 'inherit',
    cwd,
  });

  const { success: pushSuccess } = pushCommand.outputSync();

  if (pushSuccess) {
    logger.log(green('🚀 Successfully pushed changes!'));
  } else {
    logger.log(red('❌ Push failed'));
    exit(1);
  }
}

function commitChanges(
  commitMessage: string,
  logger: DepsLogger,
  exit: DepsExit,
  cwd?: string,
): void {
  try {
    const command = new Deno.Command('git', {
      args: ['commit', '-m', commitMessage],
      stdout: 'inherit',
      stderr: 'inherit',
      cwd,
    });

    const { success } = command.outputSync();

    if (success) {
      logger.log(green('✅ Successfully committed!'));
    } else {
      logger.log(red('❌ Commit failed'));
      exit(1);
    }
  } catch (error) {
    logger.log(
      red(
        `❌ Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    exit(1);
  }
}
