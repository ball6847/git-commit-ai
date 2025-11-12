import { getModelKeys } from "../providers/index.ts";
import { blue, bold, cyan, green, yellow } from "@std/fmt/colors";

const DEFAULT_MODEL = "gpt-4";

export function handleModel() {
  console.log(cyan(bold("\n🤖 Available AI Models\n")));

  const modelKeys = getModelKeys();
  if (modelKeys.length < 1) {
    console.log(yellow("No models configured."));
    return;
  }

  console.log(green("Supported model keys:"));
  modelKeys.forEach((key: string, index: number) => {
    console.log(`  ${index + 1}. ${key}`);
  });

  console.log();
  console.log(yellow("Usage:"));
  console.log(
    "  Set environment variable: export GIT_COMMIT_AI_MODEL=<model-key>",
  );
  console.log(
    "  Or use command line option: git-commit-ai generate --model <model-key>",
  );
  console.log();
  console.log(
    blue(
      `Current model: ${Deno.env.get("GIT_COMMIT_AI_MODEL") || DEFAULT_MODEL}`,
    ),
  );
}

