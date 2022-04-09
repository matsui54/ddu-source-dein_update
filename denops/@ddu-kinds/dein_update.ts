import {
  ActionArguments,
  ActionFlags,
  BaseKind,
  buffer,
  fn,
  helper,
} from "../@ddu_dein_update/deps.ts";
import { ActionData } from "../@ddu-sources/dein_update.ts";
import { getOutput } from "../@ddu_dein_update/process.ts";

type Params = Record<never, never>;

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
      const action = args.items[0].action as ActionData;
      if (action.revOld && action.revNew && action.revOld != action.revNew) {
        const res = await getOutput(
          action.path,
          "git",
          "diff",
          `${action.revOld}..${action.revNew}`,
        );
        await buffer.open(args.denops, `ddu_dein_update://diff/${action.path}`);
        const bufnr = await fn.bufnr(args.denops) as number;
        await fn.setbufvar(args.denops, bufnr, "&buftype", "nofile");
        await fn.setbufvar(args.denops, bufnr, "&filetype", "diff");
        await buffer.replace(args.denops, bufnr, res.split("\n"));
        await buffer.concrete(args.denops, bufnr);
        return ActionFlags.None;
      }
      return ActionFlags.Persist;
    },
  };
  params(): Params {
    return {};
  }
}
