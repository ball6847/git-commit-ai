import { displayCommitMessage, generateCommitMessage as aiGenerateCommitMessage } from '../ai.ts';
import { displayChangeSummary, getChangeSummary, getStagedDiff, isGitRepository } from '../git.ts';
import { Confirm, Input } from '@cliffy/prompt';
import type { AIConfig, ChangeSummary, CustomProviderConfig } from '../types.ts';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { loadConfig, mergeConfig } from '../config.ts';
import { ENV } from '../cli.ts';
import { Result } from 'typescript-result';
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

async function stageAllChanges(cwd?: string): Promise<boolean> {
  const { success } = await new Deno.Command('git', {
    args: ['add', '.'],
    stdout: 'inherit',
    stderr: 'inherit',
    cwd,
  }).output();
  return success;
}

const defaultDeps: Required<Omit<GenerateDependencies, 'cwd'>> & { cwd: string | undefined } = {
  ai: { generateCommitMessage: aiGenerateCommitMessage },
  git: { isRepository: isGitRepository, getChangeSummary, getStagedDiff },
  stageAllChanges,
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

  if (shouldSetupSignalHandlers) {
    setupSignalHandlers(logger, process);
  }

  logger.log(
    cyan(bold('\n🚀 Git Commit AI - Conventional Commit Generator\n')),
  );

  const isRepoResult = git.isRepository(cwd);
  if (!isRepoResult.ok || !isRepoResult.value) {
    logger.log(red('❌ Error: Not in a git repository.'));
    return process.exit(1);
  }

  let diff = '';
  let changeSummary: ChangeSummary = { files: [], totalFiles: 0, allDeletions: false };

  const summaryResult = git.getChangeSummary(cwd);
  if (!summaryResult.ok) {
    logger.log(red(`❌ ${summaryResult.error.message}`));
    return process.exit(1);
  }
  changeSummary = summaryResult.value;

  if (!changeSummary.allDeletions) {
    const diffResult = git.getStagedDiff(cwd);
    if (!diffResult.ok) {
      if (diffResult.error.message.includes('No staged changes')) {
        logger.log(cyan('📝 No staged changes found. Staging all changes...'));
        const success = await stageAllChanges(cwd);
        if (!success) {
          logger.log(red('❌ Failed to stage changes'));
          return process.exit(1);
        }

        const retrySummaryResult = git.getChangeSummary(cwd);
        if (!retrySummaryResult.ok) {
          logger.log(red(`❌ ${retrySummaryResult.error.message}`));
          return process.exit(1);
        }
        changeSummary = retrySummaryResult.value;

        if (!changeSummary.allDeletions) {
          const retryDiffResult = git.getStagedDiff(cwd);
          if (!retryDiffResult.ok) {
            if (retryDiffResult.error.message.includes('No staged changes')) {
              logger.log(blue('📋 No changes to commit.'));
              return process.exit(0);
            }
            logger.log(red(`❌ ${retryDiffResult.error.message}`));
            return process.exit(1);
          }
          diff = retryDiffResult.value;
        }
      } else {
        logger.log(red(`❌ ${diffResult.error.message}`));
        process.exit(1);
      }
    } else {
      diff = diffResult.value;
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
    return process.exit(1);
  }

  const commitResult = await ai.generateCommitMessage(aiConfig, diff, changeSummary);
  if (!commitResult.ok) {
    logger.log(red(`❌ AI Generation Error: ${commitResult.error.message}`));
    logger.log(
      yellow('💡 Please check your API key and internet connection.'),
    );
    return process.exit(1);
  }
  const commitMessage = commitResult.value;

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
    return process.exit(0);
  }

  let finalMessage: string;
  if (options.commit) {
    finalMessage = commitMessage;
    logger.log(green('✅ Using --commit - auto-accepting commit'));
  } else {
    const promptResult = await promptForCommitMessage(commitMessage, logger);
    if (promptResult === null) {
      logger.log(blue('📋 Commit cancelled.'));
      return process.exit(0);
    }
    finalMessage = promptResult ?? '';
    if (finalMessage === '') {
      logger.log(blue('📋 Commit cancelled.'));
      return process.exit(0);
    }
  }

  const commitChangesResult = commitChanges(finalMessage, logger, cwd);
  if (!commitChangesResult.ok) {
    return process.exit(1);
  }

  if (options.push) {
    if (options.noPush) {
      logger.log(yellow('⚠️  --push overrides --no-push.'));
    }
    const pushResult = await pushChanges(true, logger, cwd);
    if (!pushResult.ok) {
      return process.exit(1);
    }
  } else if (options.noPush || Deno.env.get('GIT_COMMIT_AI_NO_PUSH') === 'true') {
    logger.log(blue('📋 Push skipped (--no-push).'));
  } else {
    const pushResult = await pushChanges(false, logger, cwd);
    if (!pushResult.ok) {
      return process.exit(1);
    }
  }
}

function handleSigint(ctrlCCount: number, logger: Logger, process: ProcessRunner): number {
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

  return ctrlCCount;
}

function setupSignalHandlers(logger: Logger, process: ProcessRunner): void {
  let ctrlCCount = 0;

  Deno.addSignalListener('SIGINT', () => {
    ctrlCCount = handleSigint(ctrlCCount, logger, process);
  });
}

async function promptForCommitMessageInput(
  generatedMessage: string,
): Promise<Result<string, Error>> {
  return await Result.wrap(() =>
    Input.prompt({
      message: 'Commit message:',
      default: generatedMessage,
      suggestions: [generatedMessage],
    })
  )();
}

async function promptForPushConfirmation(): Promise<Result<boolean, Error>> {
  return await Result.wrap(() =>
    Confirm.prompt({
      message: 'Push changes to remote?',
      default: true,
    })
  )();
}

async function promptForCommitMessage(
  generatedMessage: string,
  logger: Logger,
): Promise<string | null> {
  logger.log(
    green(
      '✏️  Edit the commit message below (press Enter to commit, Ctrl+C twice to cancel):',
    ),
  );
  logger.log(
    yellow('💡 Tip: You can modify the message before pressing Enter\n'),
  );

  const result = await promptForCommitMessageInput(
    generatedMessage,
  );

  if (!result.ok) {
    return null;
  }

  return result.value?.trim() ?? '';
}

async function pushChanges(
  autoPush: boolean,
  logger: Logger,
  cwd?: string,
): Promise<Result<boolean, Error>> {
  if (autoPush) {
    logger.log(green('✅ Using --push - auto-accepting push'));
    // TODO: Currently hardcodes 'origin HEAD' for push.
    // Should only allow pushing if the branch has an upstream tracking remote configured,
    // rather than assuming 'origin' and the current branch.
    const command = new Deno.Command('git', {
      args: ['push', 'origin', 'HEAD'],
      stdout: 'inherit',
      stderr: 'inherit',
      cwd,
    });

    const { success: pushSuccess } = command.outputSync();

    if (pushSuccess) {
      logger.log(green('🚀 Successfully pushed changes!'));
      return Result.ok(true);
    }
    logger.log(red('❌ Push failed'));
    return Result.error(new Error('Push failed'));
  }

  const shouldPushResult = await promptForPushConfirmation();

  if (!shouldPushResult.ok || !shouldPushResult.value) {
    logger.log(blue('📋 Push cancelled.'));
    return Result.ok(false);
  }

  // TODO: Currently hardcodes 'origin HEAD' for push.
  // Should only allow pushing if the branch has an upstream tracking remote configured,
  // rather than assuming 'origin' and the current branch.
  const pushCommand = new Deno.Command('git', {
    args: ['push', 'origin', 'HEAD'],
    stdout: 'inherit',
    stderr: 'inherit',
    cwd,
  });

  const { success: pushSuccess } = pushCommand.outputSync();

  if (pushSuccess) {
    logger.log(green('🚀 Successfully pushed changes!'));
    return Result.ok(true);
  }
  logger.log(red('❌ Push failed'));
  return Result.error(new Error('Push failed'));
}

function commitChanges(
  commitMessage: string,
  logger: Logger,
  cwd?: string,
): Result<void, Error> {
  const result = Result.wrap(() => {
    const command = new Deno.Command('git', {
      args: ['commit', '-m', commitMessage],
      stdout: 'inherit',
      stderr: 'inherit',
      cwd,
    });
    return command.outputSync();
  })();

  if (!result.ok) {
    logger.log(red(`❌ Operation failed: ${result.error.message}`));
    return Result.error(new Error('Operation failed'));
  }

  const { success } = result.value;
  if (success) {
    logger.log(green('✅ Successfully committed!'));
    return Result.ok(undefined);
  }

  logger.log(red('❌ Commit failed'));
  return Result.error(new Error('Commit failed'));
}
