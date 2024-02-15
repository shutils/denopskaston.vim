import {
  ActionArguments,
  ActionFlags,
  Actions,
  BaseSource,
  GatherArguments,
  Item,
  unknownutil as u,
} from "./deps.ts";

import { ActionData, isActionData, isRgJsonMatch } from "./types.ts";

type Params = {
  kind: string;
};

const getTags = (vault: string): string[] => {
  const regex = /\[(.+?)\]/;
  const result = new Deno.Command("rg", {
    args: ["--json", "^tags:\\s\\[.*\\]", vault, "-g", "**/*"],
  });
  const { success, stdout } = result.outputSync();
  if (!success) {
    return [];
  } else {
    const rgJsons = new TextDecoder().decode(stdout)
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line))
      .filter(isRgJsonMatch);
    const tags: string[] = [];
    rgJsons.map((rgJson) => {
      if (rgJson.type === "match") {
        const matches = rgJson.data.submatches[0].match.text.match(regex);
        if (matches) {
          matches[1].split(",").map((tag) => {
            tags.push(tag.trim());
          });
        }
      }
    });
    return Array.from(new Set(tags));
  }
};

export class Source extends BaseSource<Params> {
  override kind = "file";

  override gather(
    _args: GatherArguments<Params>,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      start(controller) {
        const vault = Deno.env.get("HOME") + "/zettelkasten";
        const tags = getTags(vault);
        const items: Item<ActionData>[] = [];
        for (const tag of tags) {
          items.push({
            word: tag,
            action: {
              cmd: "rg",
              path: vault,
              lineNr: 0,
              name: tag,
              desc: "",
              summary: "",
              up_to_date: true,
              location: {
                line: 0,
                column: 0,
                taskfile: "",
              },
            },
          });
        }
        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override actions: Actions<Params> = {
    async selectNote(args: ActionArguments<Params>) {
      for (const item of args.items) {
        if (item.action) {
          const action = u.ensure(item.action, isActionData);
          await args.denops.call("ddu#start", {
            sources: [
              {
                name: "dpskasten_note",
                params: {
                  tag: action.name,
                },
              },
            ],
          });
        }
      }
      return ActionFlags.None;
    },
  };

  override params(): Params {
    return {
      kind: "file",
    };
  }
}
