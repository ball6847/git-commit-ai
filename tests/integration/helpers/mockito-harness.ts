import { anything, instance, mock, when } from 'ts-mockito';
import { Result } from 'typescript-result';
import type { AIConfig, ChangeSummary } from '../../../src/types.ts';

export interface AIService {
  generateCommitMessage(
    config: AIConfig,
    gitDiff: string,
    changeSummary: ChangeSummary,
  ): Promise<Result<string, Error>>;
}

export interface MockitoHarness {
  mock: AIService;
  instance: AIService;
  setResponse(response: string): void;
}

export function createMockitoHarness(): MockitoHarness {
  const aiMock = mock<AIService>();
  return {
    mock: aiMock,
    instance: instance(aiMock),
    setResponse(response: string) {
      when(aiMock.generateCommitMessage(anything(), anything(), anything()))
        .thenResolve(Result.ok(response));
    },
  };
}
