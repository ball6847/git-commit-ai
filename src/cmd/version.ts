import { bold, cyan } from '@std/fmt/colors';

const VERSION = '0.2.0';

export function handleVersion() {
  console.log(cyan(bold(`git-commit-ai v${VERSION}`)));
}
