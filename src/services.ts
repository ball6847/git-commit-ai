/**
 * Dependency Injection Interfaces
 *
 * This module defines shared service interfaces for dependency injection across
 * command handlers. Each interface represents a cohesive set of related capabilities.
 */

import type { AIConfig, ChangeSummary, ConfigFile } from './types.ts';
import type { Result } from 'typescript-result';
import type { ModelsDevProvider, ModelsDevResponse } from './models-dev.ts';

/**
 * Console-like logging interface
 */
export interface Logger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Process execution interface for system-level operations
 */
export interface ProcessRunner {
  exit: (code?: number) => never;
}

/**
 * Git repository reading operations
 */
export interface GitReader {
  isRepository: (cwd?: string) => boolean;
  getChangeSummary: (cwd?: string) => ChangeSummary;
  getStagedDiff: (cwd?: string) => string;
}

/**
 * Git repository write operations (commit, stage, push)
 */
export interface CommitService {
  stageAllChanges: (cwd?: string) => Promise<boolean>;
  commitChanges: (message: string, cwd?: string) => Promise<boolean>;
  pushChanges: (cwd?: string) => Promise<boolean>;
}

/**
 * Git repository write operations (alias for CommitService)
 * @deprecated Use CommitService instead
 */
export type GitWriter = CommitService;

/**
 * Combined Git service for commands that need both read and write access
 */
export type GitService = GitReader & CommitService;

/**
 * AI commit message generation service
 */
export interface AIService {
  generateCommitMessage: (
    config: AIConfig,
    gitDiff: string,
    changeSummary: ChangeSummary,
  ) => Promise<string>;
}

/**
 * Models.dev data and provider management service
 */
export interface ModelsService {
  getModelsDevData: () => Promise<ModelsDevResponse>;
  getProviderApiKey: (provider: ModelsDevProvider) => string | null;
  mergeCustomProviders: (
    data: ModelsDevResponse,
    customProviders: Record<string, unknown>,
  ) => ModelsDevResponse;
  loadConfig: () => Promise<Result<ConfigFile, Error>>;
}

/**
 * @deprecated Use ModelsService instead
 */
export type ModelService = ModelsService;

/**
 * Configuration loading service
 */
export interface ConfigService {
  loadConfig: () => Promise<Result<ConfigFile, Error>>;
}

/**
 * Provider configuration type for dependency resolution
 */
export interface ProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  npm: string;
  api?: string;
  models: ModelsDevProvider['models'] extends infer M | undefined ? M : never;
}
