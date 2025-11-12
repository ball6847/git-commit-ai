import { generateCommitMessage } from "../ai.ts";
import { getChangeSummary, getStagedDiff, isGitRepository } from "../git.ts";
import { AIConfig } from "../types.ts";
import { bold, cyan, red } from "@std/fmt/colors";

const DEFAULT_MAX_TOKENS = 200;
const DEFAULT_TEMPERATURE = 0.3;

export interface CommitOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  debug?: boolean;
  provider?: string;
  staged?: boolean;
}

export async function handleCommit(options: CommitOptions) {
  try {
    // Print header
    console.log(
      cyan(bold("\n🚀 Git Commit AI - Quick Commit\n")),
    );

    // Check if we're in a git repository
    if (!isGitRepository()) {
      console.log(red("❌ Error: Not in a git repository."));
      Deno.exit(1);
    }

    if (!options.model && !Deno.env.get("GIT_COMMIT_AI_MODEL")) {
      console.log(
        red(
          "❌ Error: No model specified. Please provide a model using the --model option or set GIT_COMMIT_AI_MODEL environment variable.",
        ),
      );
      Deno.exit(1);
    }

    // Initialize AI config
    const config: AIConfig = {
      model: options.model || Deno.env.get("GIT_COMMIT_AI_MODEL")!,
      maxTokens:
        options.maxTokens ||
        Number(Deno.env.get("GIT_COMMIT_AI_MAX_TOKENS")) ||
        DEFAULT_MAX_TOKENS,
      temperature:
        options.temperature ||
        Number(Deno.env.get("GIT_COMMIT_AI_TEMPERATURE")) ||
        DEFAULT_TEMPERATURE,
    };

    // By default, stage all changes unless --staged is explicitly specified
    if (!options.staged) {
      console.log(cyan("📝 Staging all changes..."));
      const { success } = await new Deno.Command("git", { 
        args: ["add", "."],
        stdout: "inherit",
        stderr: "inherit"
      }).output();
      
      if (!success) {
        console.log(red("❌ Failed to stage changes"));
        Deno.exit(1);
      }
    }

    // Get staged changes
    let diff = "";
    let changeSummary;
    try {
      changeSummary = getChangeSummary();
      if (!changeSummary.allDeletions) {
        diff = getStagedDiff();
      }
    } catch (error) {
      console.log(
        red(`❌ ${error instanceof Error ? error.message : "Unknown error"}`),
      );
      if (
        error instanceof Error &&
        error.message.includes("No staged changes")
      ) {
        console.log(
          cyan('💡 Tip: Use "git add <files>" to stage your changes first.'),
        );
      }
      Deno.exit(1);
    }

    if (!diff.trim()) {
      console.log(cyan("No changes to commit."));
      return;
    }

    if (options.debug) {
      console.log(cyan("Debug: Git diff preview:"));
      console.log(cyan(diff.substring(0, 500) + "..."));
      console.log(cyan(`Debug: Using model: ${options.model}`));
      console.log();
    }

    console.log(cyan("Generating commit message..."));
    const commitMessage = await generateCommitMessage(
      config,
      diff,
      changeSummary,
    );

    console.log(`\n${commitMessage}\n`);

    const { success } = await new Deno.Command("git", {
      args: ["commit", "-m", commitMessage],
      stdout: "inherit",
      stderr: "inherit",
    }).output();

    if (success) {
      console.log(cyan("✅ Changes committed successfully!"));
    } else {
      console.log(red("❌ Commit failed"));
      Deno.exit(1);
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    Deno.exit(1);
  }
}

