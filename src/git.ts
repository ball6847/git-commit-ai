import { blue, bold, green, red, yellow } from '@std/fmt/colors';
import type { ChangeSummary, FileChange, GitStatus } from './types.ts';

/**
 * Get the current git diff for staged changes
 */
export function getStagedDiff(): string {
  try {
    const command = new Deno.Command('git', {
      args: ['diff', '--cached', '--diff-filter=d'],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { success, stdout, stderr } = command.outputSync();

    if (!success) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`Git error: ${errorText}`);
    }

    const diff = new TextDecoder().decode(stdout);

    if (!diff.trim()) {
      throw new Error('No staged changes found. Please stage your changes with "git add" first.');
    }

    return diff;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('No staged changes')) {
        throw error;
      }
      throw new Error(`Git error: ${error.message}`);
    }
    throw new Error('Unknown git error occurred');
  }
}

/**
 * Get a summary of changed files
 */
export function getChangeSummary(): ChangeSummary {
  try {
    const command = new Deno.Command('git', {
      args: ['diff', '--cached', '--name-status'],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { success, stdout, stderr } = command.outputSync();

    if (!success) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`Failed to get change summary: ${errorText}`);
    }

    const statusOutput = new TextDecoder().decode(stdout);

    if (!statusOutput.trim()) {
      return { files: [], totalFiles: 0, allDeletions: false };
    }

    const files: FileChange[] = statusOutput.trim().split('\n').map((line) => {
      const [status, filename] = line.split('\t');
      return {
        status: status,
        filename: filename,
        statusDescription: getStatusDescription(status),
      };
    });

    return {
      files,
      totalFiles: files.length,
      allDeletions: files.length > 0 && files.every((f) => f.status === 'D'),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get change summary: ${error.message}`);
    }
    throw new Error('Unknown error getting change summary');
  }
}

/**
 * Convert git status code to human readable description
 */
function getStatusDescription(status: string): string {
  const statusMap: GitStatus = {
    'A': 'added',
    'M': 'modified',
    'D': 'deleted',
    'R': 'renamed',
    'C': 'copied',
    'U': 'unmerged',
  };
  return statusMap[status] || 'changed';
}

/**
 * Check if we're in a git repository
 */
export function isGitRepository(): boolean {
  try {
    const command = new Deno.Command('git', {
      args: ['rev-parse', '--git-dir'],
      stdout: 'piped',
      stderr: 'piped',
    });

    const { success } = command.outputSync();
    return success;
  } catch {
    return false;
  }
}

/**
 * Display a formatted summary of changes
 */
export function displayChangeSummary(summary: ChangeSummary): void {
  if (summary.totalFiles === 0) {
    console.log(yellow('No staged changes found.'));
    return;
  }

  console.log(blue(bold(`\n📁 Files to be committed (${summary.totalFiles}):`)));
  summary.files.forEach((file) => {
    const statusColor = file.status === 'A' ? green : file.status === 'D' ? red : yellow;
    console.log(`  ${statusColor(file.status)} ${file.filename} (${file.statusDescription})`);
  });
  console.log();
}
