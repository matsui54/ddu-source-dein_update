import {
  ActionArguments,
  ActionFlags,
  BaseKind,
  batch,
  buffer,
  DduItem,
  fn,
  helper,
  Previewer,
} from "../@ddu_dein_update/deps.ts";
import { ActionData } from "../@ddu-sources/dein_update.ts";
import { getOutput } from "../@ddu_dein_update/process.ts";

type Params = Record<never, never>;

type ViewParams = {
  paths: string[];
  fold: boolean;
};

type PluginDiff = {
  name: string;
  contents: string[];
};

export class Kind extends BaseKind<Params> {
  actions = {
    "echo": async (args: ActionArguments<Params>) => {
      const action = args.items[0].action as ActionData;
      if (action.kind == "progress") {
        return ActionFlags.Persist;
      }
      const res = action.result;
      if (res) {
        await helper.echo(args.denops, res.out + res.stderrOutput);
      }
      return ActionFlags.Persist;
    },
    "echoDiff": async (args: ActionArguments<Params>) => {
      const action = args.items[0].action as ActionData;
      if (action.kind == "progress") {
        return ActionFlags.Persist;
      }
      if (action.revOld && action.revNew && action.revOld != action.revNew) {
        const res = await getOutput(
          action.path,
          "git",
          "diff",
          `${action.revOld}..${action.revNew}`,
        );
        await helper.echo(args.denops, res);
      }
      return ActionFlags.Persist;
    },
    "viewDiff": async (args: ActionArguments<Params>) => {
      const params = args.actionParams as ViewParams;
      const openPaths = params.paths ? params.paths : [
        "doc",
        "README",
        "README.md",
      ];
      const doFold = params.fold ? params.fold : true;

      const diffs: PluginDiff[] = [];
      for (const item of args.items) {
        const action = item.action as ActionData;
        if (action.kind == "progress") {
          continue;
        }
        if (action.revOld && action.revNew && action.revOld != action.revNew) {
          const res = await getOutput(
            action.path,
            "git",
            "diff",
            `${action.revOld}..${action.revNew}`,
            "--",
            ...openPaths,
          );
          if (res.trim().length != 0) {
            diffs.push({
              name: action.name,
              contents: [action.name].concat(res.split("\n")),
            });
          }
        }
      }
      if (diffs.length !== 0) {
        await buffer.open(
          args.denops,
          `ddu_dein_update:diff`,
        );
        const bufnr = await fn.bufnr(args.denops) as number;
        await batch(args.denops, async (denops) => {
          await fn.setbufvar(denops, bufnr, "&buftype", "nofile");
          await fn.setbufvar(denops, bufnr, "&filetype", "diff");
          await buffer.replace(
            denops,
            bufnr,
            diffs.flatMap((item) => item.contents),
          );
          if (doFold && diffs.length > 0) {
            let total = 1;
            for (const diff of diffs) {
              denops.cmd(
                `${total},${total + diff.contents.length - 1}fold`,
              );
              total += diff.contents.length;
            }
          }
          await buffer.concrete(denops, bufnr);
        });
        return ActionFlags.None;
      }
      return ActionFlags.Persist;
    },
  };
  params(): Params {
    return {};
  }

  getPreviewer(args: {
    item: DduItem;
  }): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return Promise.resolve(undefined);
    }
    if (action.kind == "plugin" && action.result) {
      return Promise.resolve({
        kind: "nofile",
        contents: action.result.out.split("\n"),
      });
    }
    return Promise.resolve(undefined);
  }
}
