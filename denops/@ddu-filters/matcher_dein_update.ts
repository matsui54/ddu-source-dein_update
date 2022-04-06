import {
  BaseFilter,
  DduItem,
} from "https://deno.land/x/ddu_vim@v1.3.0/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v1.3.0/deps.ts";
import { ActionData } from "../@ddu-sources/dein_update.ts";

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
    for (const item of args.items) {
      const action = item.action as ActionData;
      const path = action.path;
      const prev = pluginMap[path]?.action as ActionData;
      if (!prev || !prev.done) {
        pluginMap[path] = item;
      }
    }
    return Promise.resolve(
      Object.values(pluginMap).sort((
        a,
        b,
        // @ts-ignore:
      ) => (b.action.score - a.action.score)),
    );
  }

  params(): Params {
    return {
      hlGroup: "Title",
    };
  }
}
