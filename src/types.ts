// Type definitions for the git commit AI project

export interface FileChange {
  status: string;
  filename: string;
  statusDescription: string;
}

export interface ChangeSummary {
  files: FileChange[];
  totalFiles: number;
  allDeletions: boolean;
}

export interface AIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GitStatus {
  [key: string]: string;
}

export interface ConfigFile {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  thinkingEffort?: 'low' | 'medium' | 'high';
  providers?: Record<string, CustomProviderConfig>;
}

export interface CustomProviderConfig {
  npm?: string;
  api?: string;
  env: string[];
  extend?: boolean;
  models?: Record<string, CustomModelConfig>;
}

export interface CustomModelConfig {
  name: string;
  reasoning?: boolean;
  tool_call?: boolean;
  attachment?: boolean;
  temperature?: boolean;
}

export interface ResolvedConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  thinkingEffort?: 'low' | 'medium' | 'high';
  providers: Record<string, CustomProviderConfig>;
}

// Conventional commit types
export type ConventionalCommitType =
  | 'feat'
  | 'fix'
  | 'docs'
  | 'style'
  | 'refactor'
  | 'test'
  | 'chore'
  | 'perf'
  | 'ci'
  | 'build';
