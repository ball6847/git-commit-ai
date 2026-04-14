import { generateCommitMessage as aiGenerateCommitMessage } from '../ai.ts';
import { getChangeSummary, getStagedDiff, isGitRepository } from '../git.ts';
import type { AIConfig, ChangeSummary, CustomProviderConfig } from '../types.ts';
import { mergeConfig } from '../config.ts';
import { ENV } from '../cli.ts';
import { bold, cyan, red } from '@std/fmt/colors';
import { ProcessExitError } from './generate.ts';
import type { AIService, CommitService, GitReader, Logger, ProcessRunner } from '../services.ts';

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
  ai?: AIService;
  git?: GitReader;
  commit?: CommitService;
  cwd?: string;
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

async function commitChanges(message: string, cwd?: string): Promise<boolean> {
  const { success } = await new Deno.Command('git', {
    args: ['commit', '-m', message],
    stdout: 'inherit',
    stderr: 'inherit',
    cwd,
  }).output();
  return success;
}

async function pushChanges(cwd?: string): Promise<boolean> {
  const { success } = await new Deno.Command('git', {
    args: ['push'],
    stdout: 'inherit',
    stderr: 'inherit',
    cwd,
  }).output();
  return success;
}

const defaultDeps: Required<Omit<CommitDependencies, 'cwd'>> & { cwd: string | undefined } = {
  ai: { generateCommitMessage: aiGenerateCommitMessage },
  git: { isRepository: isGitRepository, getChangeSummary, getStagedDiff },
  commit: {
    stageAllChanges,
    commitChanges,
    pushChanges,
  },
  cwd: undefined,
  logger: globalThis.console,
  process: { exit: Deno.exit },
};

export async function handleCommit(
  options: CommitOptions,
  deps: CommitDependencies = {},
): Promise<void> {
  const {
    ai = defaultDeps.ai,
    git = defaultDeps.git,
    commit = defaultDeps.commit,
    cwd = defaultDeps.cwd,
    logger = defaultDeps.logger,
    process = defaultDeps.process,
  } = deps;

  logger.log(cyan(bold('\n🚀 Git Commit AI - Quick Commit\n')));

  const isRepoResult = git.isRepository(cwd);
  if (!isRepoResult.ok || !isRepoResult.value) {
    logger.log(red('❌ Error: Not in a git repository.'));
    return process.exit(1);
  }

  if (!options.model) {
    logger.log(
      red(
        '❌ Error: No model specified. Please provide a model using the --model option or set GIT_COMMIT_AI_MODEL environment variable.',
      ),
    );
    return process.exit(1);
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
    const success = await commit.stageAllChanges(cwd);
    if (!success) {
      logger.log(red('❌ Failed to stage changes'));
      return process.exit(1);
    }
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
        logger.log(cyan('No changes to commit.'));
        return;
      }
      logger.log(red(`❌ ${diffResult.error.message}`));
      return process.exit(1);
    }
    diff = diffResult.value;
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
  const commitResult = await ai.generateCommitMessage(aiConfig, diff, changeSummary);
  if (!commitResult.ok) {
    logger.log(red(`❌ AI Generation Error: ${commitResult.error.message}`));
    logger.log(
      cyan('💡 Please check your API key and internet connection.'),
    );
    return process.exit(1);
  }
  const commitMessage = commitResult.value;

  logger.log(`\n${commitMessage}\n`);

  const success = await commit.commitChanges(commitMessage, cwd);
  if (success) {
    logger.log(cyan('✅ Changes committed successfully!'));
  } else {
    logger.log(red('❌ Commit failed'));
    process.exit(1);
  }
}
