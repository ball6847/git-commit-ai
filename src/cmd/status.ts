import { displayChangeSummary, getChangeSummary, isGitRepository } from '../git.ts';
import { blue, bold, cyan, green, red } from '@std/fmt/colors';

export function handleStatus() {
  try {
    if (!isGitRepository()) {
      console.log(red('❌ Not in a git repository.'));
      Deno.exit(1);
    }

    const changeSummary = getChangeSummary();
    console.log(cyan(bold('\n📊 Git Status Summary\n')));
    displayChangeSummary(changeSummary);

    if (changeSummary.totalFiles === 0) {
      console.log(
        blue(
          '💡 Stage some changes with "git add" to generate a commit message.',
        ),
      );
    } else {
      console.log(
        green(
          `Ready to generate commit message for ${changeSummary.totalFiles} file(s).`,
        ),
      );
      console.log(
        blue('Run "git-commit-ai generate" to create a commit message.'),
      );
    }
  } catch (error) {
    console.log(
      red(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    );
    Deno.exit(1);
  }
}
