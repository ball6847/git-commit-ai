import { getChangeSummary, isGitRepository } from '../git.ts';
import type { ChangeSummary } from '../types.ts';
import { blue, bold, cyan, green, red, yellow } from '@std/fmt/colors';
import { ProcessExitError } from './generate.ts';

export { ProcessExitError };

export interface StatusDependencies {
  isGitRepository?: typeof isGitRepository;
  getChangeSummary?: typeof getChangeSummary;
  cwd?: string;
  logger?: {
    log: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  exit?: (code?: number) => never;
}

type DepsLogger = NonNullable<StatusDependencies['logger']>;

const defaultDeps: Required<Omit<StatusDependencies, 'cwd'>> & {
  cwd: string | undefined;
} = {
  isGitRepository,
  getChangeSummary,
  cwd: undefined,
  logger: globalThis.console,
  exit: Deno.exit,
};

export function handleStatus(deps: StatusDependencies = {}): void {
  const {
    isGitRepository: checkGitRepo = defaultDeps.isGitRepository,
    getChangeSummary: getSummary = defaultDeps.getChangeSummary,
    cwd = defaultDeps.cwd,
    logger = defaultDeps.logger,
    exit = defaultDeps.exit,
  } = deps;

  try {
    if (!checkGitRepo(cwd)) {
      logger.log(red('❌ Not in a git repository.'));
      exit(1);
    }

    const changeSummary = getSummary(cwd);
    logger.log(cyan(bold('\n📊 Git Status Summary\n')));
    displayChangeSummaryInline(changeSummary, logger);

    if (changeSummary.totalFiles === 0) {
      logger.log(
        blue(
          '💡 Stage some changes with "git add" to generate a commit message.',
        ),
      );
    } else {
      logger.log(
        green(
          `Ready to generate commit message for ${changeSummary.totalFiles} file(s).`,
        ),
      );
      logger.log(
        blue('Run "git-commit-ai generate" to create a commit message.'),
      );
    }
  } catch (error) {
    if (error instanceof ProcessExitError) {
      throw error;
    }
    logger.log(
      red(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    exit(1);
  }
}

function displayChangeSummaryInline(
  summary: ChangeSummary,
  logger: DepsLogger,
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
