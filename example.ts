#!/usr/bin/env -S deno run --allow-run --allow-env --allow-read

/**
 * Example usage of the Git Commit AI library
 * This script demonstrates how to use the modules programmatically
 */

import { cyan, bold, green, yellow } from '@std/fmt/colors';
import { load } from '@std/dotenv';

import { isGitRepository, getChangeSummary, displayChangeSummary } from './src/git.ts';
import { initializeAI, generateCommitMessage, displayCommitMessage } from './src/ai.ts';

// Load environment variables
await load({ export: true });

async function example() {
  console.log(cyan(bold('\n🔍 Git Commit AI - Example Usage\n')));

  // Check if we're in a git repository
  if (!isGitRepository()) {
    console.log(yellow('⚠️  Not in a git repository - this is just a demo'));
    return;
  }

  try {
    // Get current change summary
    const changeSummary = getChangeSummary();
    
    if (changeSummary.totalFiles === 0) {
      console.log(yellow('📁 No staged changes found. This example shows what would happen with changes.'));
      
      // Create a mock summary for demonstration
      const mockSummary = {
        files: [
          { status: 'A', filename: 'src/example.ts', statusDescription: 'added' },
          { status: 'M', filename: 'README.md', statusDescription: 'modified' }
        ],
        totalFiles: 2
      };
      
      console.log(green('\n🎭 Mock Example:'));
      displayChangeSummary(mockSummary);
      
      const mockDiff = `diff --git a/src/example.ts b/src/example.ts
new file mode 100644
index 0000000..123456
--- /dev/null
+++ b/src/example.ts
@@ -0,0 +1,3 @@
+export function hello(): string {
+  return 'Hello, World!';
+}`;

      const apiKey = Deno.env.get('OPENROUTER_API_KEY');
      if (apiKey) {
        console.log(cyan('🤖 Would generate commit message for these changes...'));
        
        try {
          const aiConfig = initializeAI(apiKey);
          const commitMessage = await generateCommitMessage(aiConfig, mockDiff, mockSummary);
          displayCommitMessage(commitMessage);
        } catch (error) {
          console.log(yellow(`💡 AI generation example failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      } else {
        console.log(yellow('💡 Set OPENROUTER_API_KEY to see AI generation example'));
      }
      
    } else {
      // Real changes exist
      console.log(green('📁 Found real staged changes:'));
      displayChangeSummary(changeSummary);
      console.log(cyan('💡 Run "deno task generate" to create a commit message for these changes.'));
    }
    
  } catch (error) {
    console.log(yellow(`⚠️  Error in example: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

// Run the example
if (import.meta.main) {
  await example();
}
