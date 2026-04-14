import { bold, cyan } from '@std/fmt/colors';
import type { Logger } from '../services.ts';

export const VERSION = '0.2.0';

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
