import { getConfigFile } from './paths.ts';
import type { ConfigFile, ResolvedConfig } from './types.ts';
import { err, ok, Result } from './result.ts';

const DEFAULT_MAX_TOKENS = 200;
const DEFAULT_TEMPERATURE = 0.3;

export async function loadConfig(): Promise<Result<ConfigFile, Error>> {
  const configPath = getConfigFile();

  try {
    const fileContent = await Deno.readTextFile(configPath);

    try {
      const configFile = JSON.parse(fileContent) as ConfigFile;

      if (!configFile || typeof configFile !== 'object') {
        return err(new Error('Config file must be a JSON object'));
      }

      return ok(configFile);
    } catch (parseError) {
      if (parseError instanceof Error) {
        return err(
          new Error(
            `Failed to parse config file: ${parseError.message}\n\nConfig file type: ${typeof fileContent}, is not valid JSON`,
          ),
        );
      }
      return err(new Error('Invalid JSON in config file'));
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('No such file')) {
        return ok({} as ConfigFile);
      }
      return err(
        new Error(`Failed to read config file: ${error.message}`),
      );
    }
    return err(new Error('Unknown error reading config file'));
  }
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
  const temperature =
    cliOptions.temperature ?? envVars.temperature ?? configFile?.temperature ?? defaults?.temperature ?? DEFAULT_TEMPERATURE;
  const maxTokens =
    cliOptions.maxTokens ??
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