import { decode } from "./text.ts";
export class ExecuteError extends Error {
  constructor(
    public args: string[],
    public code: number,
    public stdout: Uint8Array,
    public stderr: Uint8Array,
  ) {
    super(`[${code}]: ${decode(stderr)}`);
    this.name = "ExecuteError";
  }
}

export async function getOutput(
  dir: string,
  ...cmds: string[]
): Promise<string> {
  const proc = Deno.run({
    cmd: cmds,
    stdout: "piped",
    stderr: "piped",
    cwd: dir,
  });
  const [status, stdout, stderr] = await Promise.all([
    proc.status(),
    proc.output(),
    proc.stderrOutput(),
  ]);
  proc.close();

  if (!status.success) {
    throw new ExecuteError(cmds, status.code, stdout, stderr);
  }
  return decode(stdout);
}

export function runInDir(dir: string, ...cmds: string[]) {
  const proc = Deno.run({
    cmd: cmds,
    stdout: "piped",
    stderr: "piped",
    cwd: dir,
  });
  return Promise.all([
    proc.status(),
    proc.output(),
    proc.stderrOutput(),
  ]);
}
