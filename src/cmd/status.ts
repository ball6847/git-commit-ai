import { getChangeSummary, isGitRepository as isRepository } from '../git.ts';
import type { ChangeSummary } from '../types.ts';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { ProcessExitError } from './generate.ts';
import type { GitService, Logger, ProcessRunner } from '../services.ts';

export { ProcessExitError };

export interface StatusDependencies {
  git?: Pick<GitService, 'isRepository' | 'getChangeSummary'>;
  cwd?: string;
  logger?: Logger;
  process?: ProcessRunner;
}

const defaultDeps: Required<Omit<StatusDependencies, 'cwd'>> & {
  cwd: string | undefined;
} = {
  git: { isRepository, getChangeSummary },
  cwd: undefined,
  logger: globalThis.console,
  process: { exit: Deno.exit },
};

export function handleStatus(deps: StatusDependencies = {}): void {
  const {
    git = defaultDeps.git,
    cwd = defaultDeps.cwd,
    logger = defaultDeps.logger,
    process = defaultDeps.process,
  } = deps;

  const isRepoResult = git.isRepository(cwd);
  if (!isRepoResult.ok || !isRepoResult.value) {
    logger.log(red('❌ Not in a git repository.'));
    return process.exit(1);
  }

  const changeSummaryResult = git.getChangeSummary(cwd);
  if (!changeSummaryResult.ok) {
    logger.log(red(`❌ ${changeSummaryResult.error.message}`));
    return process.exit(1);
  }

  logger.log(cyan(bold('\n📊 Git Status Summary\n')));
  displayChangeSummaryInline(changeSummaryResult.value, logger);

  if (changeSummaryResult.value.totalFiles === 0) {
    logger.log(
      blue(
        '💡 Stage some changes with "git add" to generate a commit message.',
      ),
    );
  } else {
    logger.log(
      green(
        `Ready to generate commit message for ${changeSummaryResult.value.totalFiles} file(s).`,
      ),
    );
    logger.log(
      blue('Run "git-commit-ai generate" to create a commit message.'),
    );
  }
}

function displayChangeSummaryInline(
  summary: ChangeSummary,
  logger: Logger,
): void {
  if (summary.totalFiles === 0) {
    logger.log(yellow('No staged changes found.'));
    return;
  }

  logger.log(
    blue(bold(`\n📁 Files to be committed (${summary.totalFiles}):`)),
  );
  summary.files.forEach((file) => {
    const statusColor = file.status === 'A' ? green : file.status === 'D' ? red : yellow;
    logger.log(
      `  ${statusColor(file.status)} ${file.filename} (${file.statusDescription})`,
    );
  });
  logger.log();
}
