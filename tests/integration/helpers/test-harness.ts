import { Result } from 'typescript-result';
import { getChangeSummary, getStagedDiff, isGitRepository } from '../../../src/git.ts';
import {
  type GenerateOptions,
  handleGenerate,
  ProcessExitError,
} from '../../../src/cmd/generate.ts';
import { createMockitoHarness, type MockitoHarness } from './mockito-harness.ts';
import { createTempRepo, type TempRepo } from './temp-repo.ts';

export { ProcessExitError };

export interface Harness {
  repo: TempRepo;
  ai: MockitoHarness;
  logs: string[];
  errors: string[];
  exitCode: number | null;
  run(options: GenerateOptions): Promise<Result<void, Error>>;
  cleanup(): Promise<void>;
}

function createExitHandler(): (code?: number) => never {
  return (code = 0) => {
    throw new ProcessExitError(code);
  };
}

function createGenerateRunner(
  repo: TempRepo,
  ai: MockitoHarness,
  logs: string[],
  errors: string[],
): (opts: GenerateOptions) => Promise<void> {
  return (opts: GenerateOptions) =>
    handleGenerate(opts, {
      generateCommitMessage: (config, diff, summary) =>
        ai.instance.generateCommitMessage(config, diff, summary),
      isGitRepository: () => isGitRepository(repo.dir),
      getChangeSummary: () => getChangeSummary(repo.dir),
      getStagedDiff: () => getStagedDiff(repo.dir),
      cwd: repo.dir,
      setupSignalHandlers: false,
      logger: {
        log: (...args: unknown[]) => {
          logs.push(args.map(String).join(' '));
        },
        error: (...args: unknown[]) => {
          errors.push(args.map(String).join(' '));
        },
      },
      exit: createExitHandler(),
    });
}

export function createHarness(): Harness {
  const repo = createTempRepo();
  const ai = createMockitoHarness();
  const logs: string[] = [];
  const errors: string[] = [];
  let exitCode: number | null = null;

  async function run(options: GenerateOptions): Promise<Result<void, Error>> {
    const result = await Result.wrap(() => createGenerateRunner(repo, ai, logs, errors)(options))();
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
    run,
    cleanup: repo.cleanup,
  };
}
