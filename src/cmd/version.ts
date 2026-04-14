import { bold, cyan } from '@std/fmt/colors';
import type { Logger } from '../services.ts';
import denoJson from '../../deno.json' with { type: 'json' };

export const VERSION: string = denoJson.version;

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
