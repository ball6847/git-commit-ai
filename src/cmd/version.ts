import { bold, cyan } from "@std/fmt/colors";

const VERSION = "1.0.0";

export function handleVersion() {
  console.log(cyan(bold(`git-commit-ai v${VERSION}`)));
}

