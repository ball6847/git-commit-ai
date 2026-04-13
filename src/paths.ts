import { join } from '@std/path';

function getConfigHome(): string {
  return Deno.env.get('XDG_CONFIG_HOME') || `${Deno.env.get('HOME')}/.config`;
}

function getCacheHome(): string {
  return Deno.env.get('XDG_CACHE_HOME') || `${Deno.env.get('HOME')}/.cache`;
}

const APP_NAME = 'git-commit-ai';

export function getConfigDir(): string {
  return join(getConfigHome(), APP_NAME);
}

export function getCacheDir(): string {
  return join(getCacheHome(), APP_NAME);
}

export function getConfigFile(): string {
  return join(getConfigDir(), 'config.json');
}

export function getModelsCacheFile(): string {
  return join(getCacheDir(), 'models.json');
}

export function getLegacyCacheDir(): string {
  return `${Deno.env.get('HOME')}/.git-commit-ai`;
}

export function getLegacyCacheFile(): string {
  return `${getLegacyCacheDir()}/models-cache.json`;
}

export async function migrateLegacyCache(): Promise<void> {
  const legacyFile = getLegacyCacheFile();
  const newFile = getModelsCacheFile();
  const newDir = getCacheDir();

  const legacyExists = await checkFileExists(legacyFile);
  if (!legacyExists) return;

  const newExists = await checkFileExists(newFile);
  if (newExists) return;

  await Deno.mkdir(newDir, { recursive: true });
  await Deno.rename(legacyFile, newFile);

  try {
    await Deno.remove(getLegacyCacheDir());
  } catch {
    console.warn('Legacy cache directory not empty or cannot be removed');
  }
}

async function checkFileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}