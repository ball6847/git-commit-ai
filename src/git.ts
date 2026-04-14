import { blue, bold, green, red, yellow } from '@std/fmt/colors';
import { Result } from 'typescript-result';
import type { ChangeSummary, FileChange, GitStatus } from './types.ts';

/**
 * Get the current git diff for staged changes
 */
export function getStagedDiff(cwd?: string): Result<string, Error> {
  const runCommand = (args: string[]) => {
    const command = new Deno.Command('git', { args, stdout: 'piped', stderr: 'piped', cwd });
    return command.outputSync();
  };

  const result = Result.wrap(() => runCommand(['diff', '--cached', '--diff-filter=d']))();
  if (!result.ok) {
    return Result.error(new Error(`Git error: ${result.error.message}`));
  }

  const { success, stdout, stderr } = result.value;
  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    return Result.error(new Error(`Git error: ${errorText}`));
  }

  const diff = new TextDecoder().decode(stdout);

  if (!diff.trim()) {
    return Result.error(
      new Error('No staged changes found. Please stage your changes with "git add" first.'),
    );
  }

  return Result.ok(diff);
}

/**
 * Get a summary of changed files
 */
export function getChangeSummary(cwd?: string): Result<ChangeSummary, Error> {
  const runCommand = (args: string[]) => {
    const command = new Deno.Command('git', { args, stdout: 'piped', stderr: 'piped', cwd });
    return command.outputSync();
  };

  const result = Result.wrap(() => runCommand(['diff', '--cached', '--name-status']))();
  if (!result.ok) {
    return Result.error(new Error(`Failed to get change summary: ${result.error.message}`));
  }

  const { success, stdout, stderr } = result.value;
  if (!success) {
    const errorText = new TextDecoder().decode(stderr);
    return Result.error(new Error(`Failed to get change summary: ${errorText}`));
  }

  const statusOutput = new TextDecoder().decode(stdout);

  if (!statusOutput.trim()) {
    return Result.ok({ files: [], totalFiles: 0, allDeletions: false });
  }

  const files: FileChange[] = statusOutput.trim().split('\n').map((line) => {
    const [status, filename] = line.split('\t');
    return {
      status: status,
      filename: filename,
      statusDescription: getStatusDescription(status),
    };
  });

  return Result.ok({
    files,
    totalFiles: files.length,
    allDeletions: files.length > 0 && files.every((f) => f.status === 'D'),
  });
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
export function isGitRepository(cwd?: string): Result<boolean, Error> {
  const result = Result.wrap(() => {
    const command = new Deno.Command('git', {
      args: ['rev-parse', '--git-dir'],
      stdout: 'piped',
      stderr: 'piped',
      cwd,
    });
    return command.outputSync();
  })();

  if (!result.ok) {
    return Result.ok(false);
  }

  return Result.ok(result.value.success);
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
