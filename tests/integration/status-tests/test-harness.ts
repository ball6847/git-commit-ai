import { type Result, wrap } from '../../../src/result.ts';
import { getChangeSummary, isGitRepository } from '../../../src/git.ts';
import {
  handleStatus,
  ProcessExitError,
  type StatusDependencies,
} from '../../../src/cmd/status.ts';
import { createTempRepo, type TempRepo } from '../helpers/temp-repo.ts';

export { ProcessExitError };

export interface StatusHarness {
  repo: TempRepo;
  logs: string[];
  errors: string[];
  exitCode: number | null;
  run(deps?: Partial<StatusDependencies>): Result<void, Error>;
  cleanup(): Promise<void>;
}

function createExitHandler(): (code?: number) => never {
  return (code = 0) => {
    throw new ProcessExitError(code);
  };
}

export function createStatusHarness(): StatusHarness {
  const repo = createTempRepo();
  const logs: string[] = [];
  const errors: string[] = [];
  let exitCode: number | null = null;

  function run(
    overrides: Partial<StatusDependencies> = {},
  ): Result<void, Error> {
    const result = wrap(() =>
      handleStatus({
        isGitRepository: () => isGitRepository(repo.dir),
        getChangeSummary: () => getChangeSummary(repo.dir),
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
      })
    );

    if (!result.ok) {
      if (result.error instanceof ProcessExitError) {
        exitCode = result.error.code;
        return { ok: true, value: undefined };
      }
      return result;
    }
    return { ok: true, value: undefined };
  }

  return {
    repo,
    logs,
    errors,
    get exitCode() {
      return exitCode;
    },
    run,
    cleanup: repo.cleanup,
  };
}

export function createNoRepoHarness(): {
  logs: string[];
  errors: string[];
  exitCode: number | null;
  run(): Result<void, Error>;
} {
  const logs: string[] = [];
  const errors: string[] = [];
  let exitCode: number | null = null;

  function run(): Result<void, Error> {
    const result = wrap(() =>
      handleStatus({
        isGitRepository: () => false,
        getChangeSummary: () => ({
          files: [],
          totalFiles: 0,
          allDeletions: false,
        }),
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
    );

    if (!result.ok) {
      if (result.error instanceof ProcessExitError) {
        exitCode = result.error.code;
        return { ok: true, value: undefined };
      }
      return result;
    }
    return { ok: true, value: undefined };
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
