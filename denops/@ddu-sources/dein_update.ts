import {
  BaseSource,
  Denops,
  helper,
  Item,
  ItemHighlight,
  pooledMap,
} from "../@ddu_dein_update/deps.ts";
import { runInDir } from "../@ddu_dein_update/process.ts";
import { checkChanged, getDiff, getRev } from "../@ddu_dein_update/git.ts";
import { decode } from "../@ddu_dein_update/text.ts";

export type ActionData = {
  done: boolean;
  path: string;
  score: number;
  result?: RunResult;
  revOld?: string;
  revNew?: string;
};

type Params = {
  maxProcess: number;
};

export type RunResult = {
  status: Deno.ProcessStatus;
  out: string;
  stderrOutput: string;
};

type Dein = {
  name: string;
  path: string;
  repo: string;
};

export function wordWithHighlights(
  items: [word: string, hlGroup?: string][],
): [string, ItemHighlight[]] {
  let len = 1;
  let wordAll = "";
  const hls: ItemHighlight[] = [];
  for (const item of items) {
    const [word, hlGroup] = item;
    wordAll = wordAll.concat(word);
    if (hlGroup) {
      hls.push({
        name: "ddu-dein_update-hl",
        hl_group: hlGroup,
        col: len,
        width: word.length,
      });
    }
    len += word.length;
  }
  return [wordAll, hls];
}

async function getDduItem(
  action: ActionData,
  dein: Dein,
): Promise<Item<ActionData>> {
  if (!action.result?.status.success) {
    const [word, hls] = wordWithHighlights([
      ["failure", "Error"],
      [" " + dein.repo],
    ]);
    action.score += 1e7;
    return {
      word: word,
      action,
      highlights: hls,
    };
  } else {
    const revNew = await getRev(dein.path);
    action.revNew = revNew;
    if (action.revOld && revNew && action.revOld != revNew) {
      const diff = await getDiff(dein.path, action.revOld, revNew);
      const changed = await checkChanged(
        dein.path,
        action.revOld,
        revNew,
        "doc",
        "README",
        "README.md",
      );
      const [word, hls] = wordWithHighlights([
        ["upgraded ", "Keyword"],
        [dein.repo + " "],
        diff?.insertions ? [diff.insertions + "+ ", "SpecialKey"] : [""],
        diff?.deletions ? [diff.deletions + "- ", "WarningMsg"] : [""],
        changed ? ["doc is changed"] : [""],
      ]);
      action.score += 2e7;
      return {
        word: word,
        action,
        highlights: hls,
      };
    } else {
      return {
        word: `already up to date: ${dein.repo}`,
        action,
      };
    }
  }
}

export class Source extends BaseSource<Params> {
  kind = "dein_update";

  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const deins = Object.values(
          await args.denops.call("dein#get") as Record<string, Dein>,
        );

        controller.enqueue(
          deins.map((d) => ({
            word: `...upgrading ${d.repo}`,
            action: { done: false, path: d.path, score: 0 },
          })),
        );
        const synced: string[] = [];
        const results = pooledMap(
          args.sourceParams.maxProcess,
          deins,
          async (d) => {
            const revOld = await getRev(d.path);
            return new Promise<Item<ActionData>>((resolve) => {
              runInDir(d.path, "git", "pull", "--ff", "--ff-only").then(
                async ([status, out, stderrOutput]) => {
                  const action: ActionData = {
                    done: true,
                    result: {
                      status,
                      out: decode(out),
                      stderrOutput: decode(stderrOutput),
                    },
                    path: d.path,
                    score: Date.now(),
                    revOld: revOld,
                  };
                  if (action.revNew && action.revOld != action.revNew) {
                    synced.push(d.name);
                  }
                  resolve(await getDduItem(action, d));
                },
              );
            });
          },
        );
        for await (const result of results) {
          controller.enqueue([result]);
        }
        controller.close();
        if (synced.length != 0) {
          await helper.echo(args.denops, "Executing post sync process");
          await args.denops.call("dein#post_sync", synced);
        }
        await helper.echo(args.denops, "Done");
      },
    });
  }

  params(): Params {
    return {
      maxProcess: 32,
    };
  }
}
