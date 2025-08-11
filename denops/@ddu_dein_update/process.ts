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
  const command = getCommand(dir, ...cmds);
  const { code, stdout, stderr } = await command.output();

  if (code !== 0) {
    throw new ExecuteError(cmds, code, stdout, stderr);
  }
  return decode(stdout);
}

export function getCommand(dir: string, ...cmds: string[]): Deno.Command {
  return new Deno.Command(
    cmds[0],
    {
      args: cmds.slice(1),
      stdout: "piped",
      stderr: "piped",
      cwd: dir,
    },
  );
}
