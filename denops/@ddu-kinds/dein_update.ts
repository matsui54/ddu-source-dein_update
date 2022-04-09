import {
  ActionArguments,
  ActionFlags,
  BaseKind,
  batch,
  buffer,
  fn,
  helper,
} from "../@ddu_dein_update/deps.ts";
import { ActionData } from "../@ddu-sources/dein_update.ts";
import { getOutput } from "../@ddu_dein_update/process.ts";

type Params = Record<never, never>;

type ViewParams = {
  pattern: string[];
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
      if ("isProgress" in action) {
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
      if ("isProgress" in action) {
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
      const openPattern = params.pattern ? params.pattern : [
        "doc",
        "README",
        "README.md",
      ];
      const doFold = params.fold ? params.fold : true;

      const diffs: PluginDiff[] = [];
      for (const item of args.items) {
        const action = item.action as ActionData;
        if ("isProgress" in action) {
          continue;
        }
        if (action.revOld && action.revNew && action.revOld != action.revNew) {
          const res = await getOutput(
            action.path,
            "git",
            "diff",
            `${action.revOld}..${action.revNew}`,
            "--",
            ...openPattern,
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
}
