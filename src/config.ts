import { getConfigFile } from './paths.ts';
import type { ConfigFile, ResolvedConfig } from './types.ts';
import { Result } from 'typescript-result';

const DEFAULT_MAX_TOKENS = 200;
const DEFAULT_TEMPERATURE = 0.3;

const readTextFile = Result.wrap(Deno.readTextFile);

function parseConfigContent(fileContent: string): Result<ConfigFile, Error> {
  const parseResult = Result.wrap((text: string): unknown => JSON.parse(text))(fileContent);
  if (!parseResult.ok) {
    return Result.error(
      new Error(
        `Failed to parse config file: ${parseResult.error.message}\n\nConfig file type: ${typeof fileContent}, is not valid JSON`,
      ),
    );
  }

  const configFile = parseResult.value as ConfigFile;
  if (!configFile || typeof configFile !== 'object' || Array.isArray(configFile)) {
    return Result.error(new Error('Config file must be a JSON object'));
  }

  return Result.ok(configFile);
}

export async function loadConfig(configPath?: string): Promise<Result<ConfigFile, Error>> {
  const path = configPath ?? getConfigFile();

  const fileResult = await readTextFile(path);
  if (!fileResult.ok) {
    if (fileResult.error instanceof Error && fileResult.error.message.includes('No such file')) {
      return Result.ok({} as ConfigFile);
    }
    if (fileResult.error instanceof Error) {
      return Result.error(
        new Error(`Failed to read config file: ${fileResult.error.message}`),
      );
    }
    return Result.error(new Error('Unknown error reading config file'));
  }

  return parseConfigContent(fileResult.value);
}

export function mergeConfig(
  cliOptions: { model?: string; temperature?: number; maxTokens?: number },
  envVars: { model?: string; temperature?: number; maxTokens?: number; thinkingEffort?: string },
  configFile?: ConfigFile,
  defaults?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    thinkingEffort?: 'low' | 'medium' | 'high';
    providers?: unknown;
  },
): ResolvedConfig {
  const model = cliOptions.model || envVars.model || configFile?.model || defaults?.model || '';
  const temperature = cliOptions.temperature ?? envVars.temperature ?? configFile?.temperature ??
    defaults?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens = cliOptions.maxTokens ??
    envVars.maxTokens ??
    configFile?.maxTokens ??
    defaults?.maxTokens ??
    DEFAULT_MAX_TOKENS;

  const thinkingEffort = configFile?.thinkingEffort ?? defaults?.thinkingEffort;

  let providers = {};
  if (configFile?.providers) {
    providers = configFile.providers;
  } else if (defaults?.providers) {
    providers = defaults.providers;
  }

  return {
    model,
    temperature: Number(temperature),
    maxTokens: Number(maxTokens),
    thinkingEffort,
    providers,
  };
}

export type { CustomProviderConfig } from './types.ts';
export type { CustomModelConfig } from './types.ts';
