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
