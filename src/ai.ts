import { blue, green, white, yellow } from '@std/fmt/colors';
import type {
  AIConfig,
  ChangeSummary,
  ConventionalCommitType,
  OpenRouterRequest,
  OpenRouterResponse,
} from './types.ts';

/**
 * Initialize AI configuration for OpenRouter
 */
export function initializeAI(
  apiKey: string,
  model = 'meta-llama/llama-3.2-3b-instruct',
): AIConfig {
  if (!apiKey) {
    throw new Error(
      'OpenRouter API key is required. Please set OPENROUTER_API_KEY in your .env file.',
    );
  }

  return {
    apiKey,
    model,
    baseURL: 'https://openrouter.ai/api/v1',
    maxTokens: 200,
    temperature: 0.3,
  };
}

/**
 * Generate a conventional commit message from git diff using OpenRouter API
 */
export async function generateCommitMessage(
  config: AIConfig,
  gitDiff: string,
  changeSummary: ChangeSummary,
): Promise<string> {
  const prompt = createCommitPrompt(gitDiff, changeSummary);

  try {
    console.log(blue('🤖 Analyzing changes with AI...'));

    const requestBody: OpenRouterRequest = {
      model: config.model,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    };

    const response = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/ball6/git-commit-ai',
        'X-Title': 'Git Commit AI',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data: OpenRouterResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response generated from AI model');
    }

    const commitMessage = data.choices[0].message.content.trim();

    // Remove quotes if present
    const cleanMessage = commitMessage.replace(/^["']|["']$/g, '');

    // Validate the commit message format
    if (!isValidConventionalCommit(cleanMessage)) {
      console.log(
        yellow('⚠️  Generated message may not follow conventional commit format perfectly.'),
      );
    }

    return cleanMessage;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate commit message: ${error.message}`);
    }
    throw new Error('Unknown error occurred during AI generation');
  }
}

/**
 * Create the prompt for commit message generation
 */
function createCommitPrompt(gitDiff: string, changeSummary: ChangeSummary): string {
  const filesList = changeSummary.files.map((f) => `- ${f.filename} (${f.statusDescription})`).join(
    '\n',
  );

  return `Analyze these git changes and generate a conventional commit message:

FILES CHANGED (${changeSummary.totalFiles} files):
${filesList}

GIT DIFF:
${gitDiff}

Generate a single, concise conventional commit message that best describes these changes.`;
}

/**
 * System prompt for the AI model
 */
function getSystemPrompt(): string {
  return `You are an expert developer who writes perfect conventional commit messages.

RULES:
1. Follow conventional commit format: type(scope): description
2. Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
3. Keep description under 72 characters
4. Use lowercase for description
5. No period at the end
6. Be specific and concise
7. Focus on WHAT changed, not HOW

EXAMPLES:
- feat(auth): add user login validation
- fix(api): resolve null pointer in user service
- docs(readme): update installation instructions
- refactor(utils): simplify date formatting logic
- chore(deps): update lodash to v4.17.21

Respond with ONLY the commit message, no explanations or additional text.`;
}

/**
 * Validate if a commit message follows conventional commit format
 */
function isValidConventionalCommit(message: string): boolean {
  // Basic regex for conventional commit format
  const conventionalCommitRegex =
    /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?: .{1,50}$/;
  return conventionalCommitRegex.test(message);
}

/**
 * Parse a conventional commit message into its components
 */
export function parseConventionalCommit(message: string): {
  type: ConventionalCommitType | null;
  scope: string | null;
  description: string;
  isValid: boolean;
} {
  const match = message.match(
    /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\((.+)\))?: (.+)$/,
  );

  if (!match) {
    return {
      type: null,
      scope: null,
      description: message,
      isValid: false,
    };
  }

  return {
    type: match[1] as ConventionalCommitType,
    scope: match[3] || null,
    description: match[4],
    isValid: true,
  };
}

/**
 * Display the generated commit message with formatting
 */
export function displayCommitMessage(commitMessage: string): void {
  console.log(green('\n✨ Generated Commit Message:'));
  console.log(white(`"${commitMessage}"`));
  console.log();
}
