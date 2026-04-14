import { Result } from 'typescript-result';

export interface TempRepo {
  dir: string;
  writeFile(name: string, content: string): void;
  stageFile(name: string, content: string): void;
  getLog(): string[];
  isCommitted(message: string): boolean;
  addRemote(remoteDir: string): void;
  cleanup(): Promise<void>;
}

export function createTempRepo(): TempRepo {
  const dir = Deno.makeTempDirSync();

  function runGit(args: string[]): string {
    const command = new Deno.Command('git', {
      args,
      cwd: dir,
      stdout: 'piped',
      stderr: 'piped',
    });
    const { success, stdout, stderr } = command.outputSync();
    const output = new TextDecoder().decode(stdout);
    const errText = new TextDecoder().decode(stderr);
    if (!success) {
      throw new Error(`git ${args.join(' ')} failed: ${errText}`);
    }
    return output;
  }

  runGit(['init']);
  runGit(['config', 'user.email', 'test@example.com']);
  runGit(['config', 'user.name', 'Test User']);

  function writeFile(name: string, content: string): void {
    const filePath = `${dir}/${name}`;
    const lastSlash = name.lastIndexOf('/');
    if (lastSlash > 0) {
      const subdir = `${dir}/${name.substring(0, lastSlash)}`;
      Deno.mkdirSync(subdir, { recursive: true });
    }
    Deno.writeTextFileSync(filePath, content);
  }

  function stageFile(name: string, content: string): void {
    writeFile(name, content);
    runGit(['add', name]);
  }

  function getLog(): string[] {
    const result = Result.wrap(() => runGit(['log', '--pretty=format:%s']))();
    if (!result.ok) {
      return [];
    }
    return result.value.split('\n').filter(Boolean);
  }

  function isCommitted(message: string): boolean {
    return getLog().includes(message);
  }

  function addRemote(remoteDir: string): void {
    runGit(['remote', 'add', 'origin', remoteDir]);
    runGit(['branch', '-M', 'main']);
  }

  async function cleanup(): Promise<void> {
    await Deno.remove(dir, { recursive: true }).catch(() => {});
  }

  return { dir, writeFile, stageFile, getLog, isCommitted, addRemote, cleanup };
}

export function getRemoteLog(remoteDir: string): Result<string[], Error> {
  const command = new Deno.Command('git', {
    args: ['log', '--all', '--pretty=format:%s'],
    cwd: remoteDir,
    stdout: 'piped',
    stderr: 'piped',
  });
  const { success, stdout, stderr } = command.outputSync();
  if (!success) {
    const errText = new TextDecoder().decode(stderr);
    if (errText.includes('does not have any commits yet')) {
      return Result.ok([]);
    }
    return Result.error(new Error(`git log failed: ${errText}`));
  }
  return Result.ok(new TextDecoder().decode(stdout).split('\n').filter(Boolean));
}
