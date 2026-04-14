import { displayCommitMessage, generateCommitMessage as aiGenerateCommitMessage } from '../ai.ts';
import { displayChangeSummary, getChangeSummary, getStagedDiff, isGitRepository } from '../git.ts';
import { Confirm, Input } from '@cliffy/prompt';
import type { AIConfig, ChangeSummary, CustomProviderConfig } from '../types.ts';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { loadConfig, mergeConfig } from '../config.ts';
import { ENV } from '../cli.ts';
import type { AIService, GitReader, Logger, ProcessRunner } from '../services.ts';

export class ProcessExitError extends Error {
  constructor(public code: number) {
    super(`Process exited with code ${code}`);
  }
}

export interface GenerateDependencies {
  ai?: AIService;
  git?: GitReader;
  stageAllChanges?: (cwd?: string) => Promise<boolean>;
  cwd?: string;
  setupSignalHandlers?: boolean;
  logger?: Logger;
  process?: ProcessRunner;
}

const defaultDeps: Required<Omit<GenerateDependencies, 'cwd'>> & { cwd: string | undefined } = {
  ai: { generateCommitMessage: aiGenerateCommitMessage },
  git: { isRepository: isGitRepository, getChangeSummary, getStagedDiff },
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
  process: { exit: Deno.exit },
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
    ai = defaultDeps.ai,
    git = defaultDeps.git,
    stageAllChanges = defaultDeps.stageAllChanges,
    cwd = defaultDeps.cwd,
    setupSignalHandlers: shouldSetupSignalHandlers = defaultDeps.setupSignalHandlers,
    logger = defaultDeps.logger,
    process = defaultDeps.process,
  } = deps;

  try {
    if (shouldSetupSignalHandlers) {
      setupSignalHandlers(logger, process);
    }

    logger.log(
      cyan(bold('\n🚀 Git Commit AI - Conventional Commit Generator\n')),
    );

    if (!git.isRepository(cwd)) {
      logger.log(red('❌ Error: Not in a git repository.'));
      process.exit(1);
    }

    let diff = '';
    let changeSummary: ChangeSummary = { files: [], totalFiles: 0, allDeletions: false };
    try {
      changeSummary = git.getChangeSummary(cwd);
      if (!changeSummary.allDeletions) {
        diff = git.getStagedDiff(cwd);
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
          process.exit(1);
        }
        try {
          changeSummary = git.getChangeSummary(cwd);
          if (!changeSummary.allDeletions) {
            diff = git.getStagedDiff(cwd);
          }
        } catch (retryError) {
          if (
            retryError instanceof Error &&
            retryError.message.includes('No staged changes')
          ) {
            logger.log(blue('📋 No changes to commit.'));
            process.exit(0);
          }
          throw retryError;
        }
      } else {
        logger.log(
          red(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
        process.exit(1);
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
      process.exit(1);
    }

    let commitMessage = '';
    try {
      commitMessage = await ai.generateCommitMessage(
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
      process.exit(1);
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
      process.exit(0);
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
        process.exit(0);
      }
    }

    commitChanges(finalMessage, logger, process, cwd);

    if (options.push) {
      if (options.noPush) {
        logger.log(yellow('⚠️  --push overrides --no-push.'));
      }
      await pushChanges(true, logger, process, cwd);
    } else if (options.noPush || Deno.env.get('GIT_COMMIT_AI_NO_PUSH') === 'true') {
      logger.log(blue('📋 Push skipped (--no-push).'));
    } else {
      await pushChanges(false, logger, process, cwd);
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
    process.exit(1);
  }
}

function setupSignalHandlers(logger: Logger, process: ProcessRunner): void {
  let ctrlCCount = 0;

  Deno.addSignalListener('SIGINT', () => {
    ctrlCCount++;
    if (ctrlCCount === 1) {
      logger.log(
        yellow('\n⚠️  Press Ctrl+C again to cancel without committing...'),
      );
    } else {
      logger.log(blue('\n📋 Operation cancelled. No commit was made.'));
      process.exit(0);
    }

    setTimeout(() => {
      ctrlCCount = 0;
    }, 3000);
  });
}

async function promptForCommitMessage(
  generatedMessage: string,
  logger: Logger,
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
  logger: Logger,
  process: ProcessRunner,
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
      process.exit(1);
    }
    return;
  }

  const shouldPush = await Confirm.prompt({
    message: 'Push changes to remote?',
    default: true,
  });

  if (!shouldPush) {
    logger.log(blue('📋 Push cancelled.'));
    process.exit(0);
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
    process.exit(1);
  }
}

function commitChanges(
  commitMessage: string,
  logger: Logger,
  process: ProcessRunner,
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
      process.exit(1);
    }
  } catch (error) {
    logger.log(
      red(
        `❌ Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    process.exit(1);
  }
}
