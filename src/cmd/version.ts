import { bold, cyan } from '@std/fmt/colors';
import type { Logger } from '../services.ts';
import { join } from '@std/path';

const DENO_JSON_PATH = join(import.meta.dirname!, '..', '..', 'deno.json');

export const VERSION: string = JSON.parse(
  await Deno.readTextFile(DENO_JSON_PATH),
).version;

export interface VersionDependencies {
  logger?: Logger;
}

const defaultDeps: Required<VersionDependencies> = {
  logger: globalThis.console,
};

export function handleVersion(deps: VersionDependencies = {}): void {
  const { logger = defaultDeps.logger } = deps;
  logger.log(cyan(bold(`git-commit-ai v${VERSION}`)));
}
