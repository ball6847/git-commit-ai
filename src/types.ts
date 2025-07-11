// Type definitions for the git commit AI project

export interface FileChange {
  status: string;
  filename: string;
  statusDescription: string;
}

export interface ChangeSummary {
  files: FileChange[];
  totalFiles: number;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  maxTokens: number;
  temperature: number;
}

export interface CLIOptions {
  model?: string;
  debug?: boolean;
  dryRun?: boolean;
}

export interface GitStatus {
  [key: string]: string;
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

export interface ConventionalCommit {
  type: ConventionalCommitType;
  scope?: string;
  description: string;
  breakingChange?: boolean;
}
