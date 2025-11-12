import { generateCommitMessage } from "../ai.ts";
import { getChangeSummary, getStagedDiff } from "../git.ts";
import { AIConfig } from "../types.ts";

export interface CommitOptions {
  model?: string;
  provider?: string;
  staged?: boolean;
  all?: boolean;
}

export async function handleCommit(options: CommitOptions) {
  try {
    const config: AIConfig = {
      model: options.model || Deno.env.get("GIT_COMMIT_AI_MODEL") || "gpt-4",
      maxTokens: 1000,
      temperature: 0.7,
    };

    if (options.all) {
      await new Deno.Command("git", { args: ["add", "."] }).output();
    }

    const diff = getStagedDiff();
    const changeSummary = getChangeSummary();

    if (!diff.trim()) {
      console.log("No changes to commit.");
      return;
    }

    console.log("Generating commit message...");
    const commitMessage = await generateCommitMessage(
      config,
      diff,
      changeSummary,
    );

    console.log(`\n${commitMessage}\n`);

    await new Deno.Command("git", {
      args: ["commit", "-m", commitMessage],
    }).output();
    console.log("Changes committed successfully!");
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    Deno.exit(1);
  }
}

