import { BaseFilter, DduItem, Denops } from "../@ddu_dein_update/deps.ts";
import {
  ActionData,
  PluginData,
  ProgressData,
} from "../@ddu-sources/dein_update.ts";

type Params = {
  hlGroup: string;
};

export class Filter extends BaseFilter<Params> {
  filter(args: {
    denops: Denops;
    input: string;
    items: DduItem[];
    filterParams: Params;
  }): Promise<DduItem[]> {
    const pluginMap: Record<string, DduItem> = {};
    let progress: DduItem;
    let numDone = 0;
    for (const item of args.items) {
      const action = item.action as ActionData;
      if ("isProgress" in action) {
        progress = item;
        continue;
      }
      if (action.done) {
        numDone++;
      }
      const path = action.path;
      const prev = pluginMap[path]?.action as PluginData;
      if (!prev || !prev.done) {
        pluginMap[path] = item;
      }
    }
    const items = Object.values(pluginMap).sort((
      a,
      b,
      // @ts-ignore:
    ) => (b.action.score - a.action.score));
    if (progress) {
      const numAll = (progress.action as ProgressData).numPlugin;
      const lenBar = (numDone / numAll) * 50;
      progress.word = `${numDone}/${numAll} [${"=".repeat(lenBar)}${
        "-".repeat(50 - lenBar)
      }]`;
      items.unshift(progress);
    }
    return Promise.resolve(items);
  }

  params(): Params {
    return {
      hlGroup: "Title",
    };
  }
}
