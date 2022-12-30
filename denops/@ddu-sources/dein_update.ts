import {
  abortable,
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

export type ActionData = ProgressData | PluginData;

export type ProgressData = {
  kind: "progress";
  numPlugin: number;
};

export type PluginData = {
  kind: "plugin";
  done: boolean;
  path: string;
  score: number;
  name: string;
  result?: RunResult;
  revOld?: string;
  revNew?: string;
};

type Params = {
  maxProcess: number;
  useGraphQL: boolean;
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
  action: PluginData,
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
    if (action.revOld && action.revNew && action.revOld != action.revNew) {
      const diff = await getDiff(dein.path, action.revOld, action.revNew);
      const changed = await checkChanged(
        dein.path,
        action.revOld,
        action.revNew,
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

async function getPlugins(
  denops: Denops,
  useGraphQL: boolean,
): Promise<Dein[]> {
  if (useGraphQL) {
    return (await denops.call("dein#get_updated_plugins")) as Dein[];
  } else {
    return Object.values(
      await denops.call("dein#get") as Record<string, Dein>,
    );
  }
}

export class Source extends BaseSource<Params> {
  kind = "dein_update";

  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    const abortController = new AbortController();
    return new ReadableStream({
      async start(controller) {
        const deins = await getPlugins(
          args.denops,
          args.sourceParams.useGraphQL,
        );

        if (deins.length == 0) {
          await helper.echo(args.denops, "Nothing to update");
          controller.close();
          return;
        }

        controller.enqueue(
          [{
            word: "[]",
            action: { kind: "progress", numPlugin: deins.length },
          }],
        );
        const synced: string[] = [];
        const results = pooledMap(
          args.sourceParams.maxProcess,
          deins,
          async (d) => {
            controller.enqueue(
              [{
                word: `...upgrading ${d.repo}`,
                action: {
                  kind: "plugin",
                  done: false,
                  path: d.path,
                  score: 0,
                  name: d.name,
                },
              }],
            );
            const revOld = await getRev(d.path);
            return new Promise<Item<ActionData>>((resolve, reject) => {
              const proc = runInDir(d.path, "git", "pull", "--ff", "--ff-only");
              const running = abortable(
                Promise.all([
                  proc.status(),
                  proc.output(),
                  proc.stderrOutput(),
                ]),
                abortController.signal,
              );
              running.then(
                async ([status, out, stderrOutput]) => {
                  const action: ActionData = {
                    kind: "plugin",
                    done: true,
                    result: {
                      status,
                      out: decode(out),
                      stderrOutput: decode(stderrOutput),
                    },
                    path: d.path,
                    score: Date.now(),
                    revOld: revOld,
                    revNew: await getRev(d.path),
                    name: d.name,
                  };
                  if (action.revNew && action.revOld != action.revNew) {
                    synced.push(d.name);
                  }
                  resolve(await getDduItem(action, d));
                },
              ).catch((e) => {
                if (e instanceof DOMException) {
                  proc.kill("SIGTERM");
                }
                reject(e);
              });
            });
          },
        );
        try {
          for await (const result of results) {
            controller.enqueue([result]);
          }
        } catch (e: unknown) {
          if (e instanceof AggregateError) {
            for (const error of e.errors) {
              if (!(error instanceof DOMException)) {
                console.error(error);
              } else {
                // console.log("cancel");
              }
            }
          }
        }
        if (synced.length != 0) {
          await helper.echo(args.denops, "Executing post sync process");
          await args.denops.call("dein#post_sync", synced);
        }
        await helper.echo(args.denops, "Done");
        controller.close();
      },

      cancel(reason): void {
        abortController.abort(reason);
      },
    });
  }

  params(): Params {
    return {
      maxProcess: 32,
      useGraphQL: false,
    };
  }
}
