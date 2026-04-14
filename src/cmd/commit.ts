import { generateCommitMessage as aiGenerateCommitMessage } from '../ai.ts';
import { getChangeSummary, getStagedDiff, isGitRepository } from '../git.ts';
import type { AIConfig, ChangeSummary, CustomProviderConfig } from '../types.ts';
import { mergeConfig } from '../config.ts';
import { ENV } from '../cli.ts';
import { bold, cyan, red } from '@std/fmt/colors';
import { ProcessExitError } from './generate.ts';

export { ProcessExitError };

export interface CommitOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  debug?: boolean;
  provider?: string;
  staged?: boolean;
}

export interface CommitDependencies {
  generateCommitMessage?: typeof aiGenerateCommitMessage;
  isGitRepository?: typeof isGitRepository;
  getChangeSummary?: typeof getChangeSummary;
  getStagedDiff?: typeof getStagedDiff;
  stageAllChanges?: (cwd?: string) => Promise<boolean>;
  commitChanges?: (message: string, cwd?: string) => Promise<boolean>;
  cwd?: string;
  logger?: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  exit?: (code?: number) => never;
}

const defaultDeps: Required<Omit<CommitDependencies, 'cwd'>> & { cwd: string | undefined } = {
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
  commitChanges: async (message: string, cwd?: string): Promise<boolean> => {
    const { success } = await new Deno.Command('git', {
      args: ['commit', '-m', message],
      stdout: 'inherit',
      stderr: 'inherit',
      cwd,
    }).output();
    return success;
  },
  cwd: undefined,
  logger: globalThis.console,
  exit: Deno.exit,
};

export async function handleCommit(
  options: CommitOptions,
  deps: CommitDependencies = {},
): Promise<void> {
  const {
    generateCommitMessage = defaultDeps.generateCommitMessage,
    isGitRepository: checkGitRepo = defaultDeps.isGitRepository,
    getChangeSummary: getSummary = defaultDeps.getChangeSummary,
    getStagedDiff: getDiff = defaultDeps.getStagedDiff,
    stageAllChanges = defaultDeps.stageAllChanges,
    commitChanges = defaultDeps.commitChanges,
    cwd = defaultDeps.cwd,
    logger = defaultDeps.logger,
    exit = defaultDeps.exit,
  } = deps;

  try {
    logger.log(cyan(bold('\n🚀 Git Commit AI - Quick Commit\n')));

    if (!checkGitRepo(cwd)) {
      logger.log(red('❌ Error: Not in a git repository.'));
      exit(1);
    }

    if (!options.model) {
      logger.log(
        red(
          '❌ Error: No model specified. Please provide a model using the --model option or set GIT_COMMIT_AI_MODEL environment variable.',
        ),
      );
      exit(1);
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

    if (!options.staged) {
      logger.log(cyan('📝 Staging all changes...'));
      const success = await stageAllChanges(cwd);
      if (!success) {
        logger.log(red('❌ Failed to stage changes'));
        exit(1);
      }
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
        logger.log(cyan('No changes to commit.'));
        return;
      }
      logger.log(
        red(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      exit(1);
    }

    if (!diff.trim()) {
      logger.log(cyan('No changes to commit.'));
      return;
    }

    if (options.debug) {
      logger.log(cyan('Debug: Git diff preview:'));
      logger.log(cyan(diff.substring(0, 500) + '...'));
      logger.log(cyan(`Debug: Using model: ${options.model}`));
      logger.log();
    }

    logger.log(cyan('Generating commit message...'));
    const commitMessage = await generateCommitMessage(aiConfig, diff, changeSummary);

    logger.log(`\n${commitMessage}\n`);

    const success = await commitChanges(commitMessage, cwd);
    if (success) {
      logger.log(cyan('✅ Changes committed successfully!'));
    } else {
      logger.log(red('❌ Commit failed'));
      exit(1);
    }
  } catch (error) {
    if (error instanceof ProcessExitError) {
      throw error;
    }
    logger.error(
      'Error:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    exit(1);
  }
}
