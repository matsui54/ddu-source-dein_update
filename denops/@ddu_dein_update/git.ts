import { getOutput } from "./process.ts";

export async function getRev(dir: string): Promise<string | undefined> {
  try {
    return (await getOutput(dir, "git", "rev-parse", "HEAD")).trim();
  } catch {
    return undefined;
  }
}

export async function checkChanged(
  dir: string,
  revOld: string,
  revNew: string,
  ...paths: string[]
): Promise<boolean> {
  const out = (await getOutput(
    dir,
    "git",
    "diff",
    "--name-only",
    `${revOld}..${revNew}`,
    "--",
    ...paths,
  ))?.trim();
  if (out.length != 0) return true;
  return false;
}

export type DiffItem = {
  changed: string;
  insertions?: string;
  deletions?: string;
};

/**
 * Retrieve diff items like and parse it
 * "1 file changed, 3 insertions(+), 3 deletions(-)"
 */
export async function getDiff(
  dir: string,
  revOld: string,
  revNew: string,
): Promise<DiffItem | undefined> {
  const out = (await getOutput(
    dir,
    "git",
    "diff",
    `${revOld}..${revNew}`,
    "--shortstat",
  ))?.trim();
  if (!out) return undefined;
  return parseDiff(out);
}

/**
 * Parse retrieved diff
 */
export function parseDiff(diff: string): DiffItem | undefined {
  const m = diff.match(
    /^(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(\-\))?/,
  );
  if (m) {
    return {
      changed: m[1],
      insertions: m[2],
      deletions: m[3],
    };
  }
  return undefined;
}
