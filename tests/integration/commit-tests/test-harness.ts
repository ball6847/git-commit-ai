import { Result } from 'typescript-result';
import { getChangeSummary, getStagedDiff, isGitRepository } from '../../../src/git.ts';
import {
  type CommitDependencies,
  type CommitOptions,
  handleCommit,
  ProcessExitError,
} from '../../../src/cmd/commit.ts';
import { createMockitoHarness, type MockitoHarness } from '../helpers/mockito-harness.ts';
import { createTempRepo, type TempRepo } from '../helpers/temp-repo.ts';

export { ProcessExitError };

export interface CommitHarness {
  repo: TempRepo;
  ai: MockitoHarness;
  logs: string[];
  errors: string[];
  exitCode: number | null;
  stageAllCalled: boolean;
  commitMessages: string[];
  run(options: CommitOptions, deps?: Partial<CommitDependencies>): Promise<Result<void, Error>>;
  cleanup(): Promise<void>;
}

function createExitHandler(): (code?: number) => never {
  return (code = 0) => {
    throw new ProcessExitError(code);
  };
}

export function createHarness(): CommitHarness {
  const repo = createTempRepo();
  const ai = createMockitoHarness();
  const logs: string[] = [];
  const errors: string[] = [];
  let exitCode: number | null = null;
  let stageAllCalled = false;
  const commitMessages: string[] = [];

  async function run(
    options: CommitOptions,
    overrides: Partial<CommitDependencies> = {},
  ): Promise<Result<void, Error>> {
    const deps: CommitDependencies = {
      generateCommitMessage: (config, diff, summary) =>
        ai.instance.generateCommitMessage(config, diff, summary),
      isGitRepository: () => isGitRepository(repo.dir),
      getChangeSummary: () => getChangeSummary(repo.dir),
      getStagedDiff: () => getStagedDiff(repo.dir),
      stageAllChanges: () => {
        stageAllCalled = true;
        const { success } = new Deno.Command('git', {
          args: ['add', '.'],
          stdout: 'piped',
          stderr: 'piped',
          cwd: repo.dir,
        }).outputSync();
        return Promise.resolve(success);
      },
      commitChanges: (message: string) => {
        commitMessages.push(message);
        const { success } = new Deno.Command('git', {
          args: ['commit', '-m', message],
          stdout: 'piped',
          stderr: 'piped',
          cwd: repo.dir,
        }).outputSync();
        return Promise.resolve(success);
      },
      cwd: repo.dir,
      logger: {
        log: (...args: unknown[]) => {
          logs.push(args.map(String).join(' '));
        },
        error: (...args: unknown[]) => {
          errors.push(args.map(String).join(' '));
        },
      },
      exit: createExitHandler(),
      ...overrides,
    };

    const result = await Result.wrap(() => handleCommit(options, deps))();
    if (!result.ok) {
      if (result.error instanceof ProcessExitError) {
        exitCode = result.error.code;
        return Result.ok(undefined);
      }
      return result;
    }
    return Result.ok(undefined);
  }

  return {
    repo,
    ai,
    logs,
    errors,
    get exitCode() {
      return exitCode;
    },
    get stageAllCalled() {
      return stageAllCalled;
    },
    commitMessages,
    run,
    cleanup: repo.cleanup,
  };
}

export function createNoRepoHarness(): {
  logs: string[];
  errors: string[];
  exitCode: number | null;
  run(options: CommitOptions): Promise<Result<void, Error>>;
} {
  const logs: string[] = [];
  const errors: string[] = [];
  let exitCode: number | null = null;

  async function run(options: CommitOptions): Promise<Result<void, Error>> {
    const result = await Result.wrap(() =>
      handleCommit(options, {
        isGitRepository: () => false,
        getChangeSummary: () => ({
          files: [],
          totalFiles: 0,
          allDeletions: false,
        }),
        stageAllChanges: () => Promise.resolve(false),
        commitChanges: () => Promise.resolve(false),
        logger: {
          log: (...args: unknown[]) => {
            logs.push(args.map(String).join(' '));
          },
          error: (...args: unknown[]) => {
            errors.push(args.map(String).join(' '));
          },
        },
        exit: createExitHandler(),
      })
    )();

    if (!result.ok) {
      if (result.error instanceof ProcessExitError) {
        exitCode = result.error.code;
        return Result.ok(undefined);
      }
      return result;
    }
    return Result.ok(undefined);
  }

  return {
    logs,
    errors,
    get exitCode() {
      return exitCode;
    },
    run,
  };
}
