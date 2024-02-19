import {
  ActionArguments,
  ActionFlags,
  Actions,
  BaseSource,
  fn,
  GatherArguments,
  Item,
  path,
  unknownutil as u,
} from "./deps.ts";

import { isNote, isRgJsonMatch, Note } from "./types.ts";
import { paste } from "./util.ts";

export const isActionData = u.isObjectOf({
  cmd: u.isString,
  path: u.isString,
  lineNr: u.isNumber,
  name: u.isString,
  desc: u.isString,
  summary: u.isString,
  up_to_date: u.isBoolean,
  note: isNote,
  location: u.isObjectOf({
    line: u.isNumber,
    column: u.isNumber,
    taskfile: u.isString,
  }),
});

export type ActionData = u.PredicateType<typeof isActionData>;

type Params = {
  tag?: string;
};

function getNotes(vault: string) {
  const result = new Deno.Command("rg", {
    args: ["--files", vault, "-g", "**/*\\.md"],
  });
  const { success, stdout } = result.outputSync();
  if (!success) {
    return [];
  } else {
    const notes: Note[] = [];
    const notePaths = new TextDecoder().decode(stdout)
      .split("\n")
      .filter((line) => line.length > 0);
    notePaths.map((notePath) => {
      const title = getNoteTitle(notePath);
      const name = path.basename(notePath);
      let note: Note = {
        path: notePath,
        name,
        vault,
      };
      if (title !== "") {
        note = {
          ...note,
          title,
        };
      }
      notes.push(note);
    });
    return notes;
  }
}

function getNotesWithTag(vault: string, tag: string) {
  const result = new Deno.Command("rg", {
    args: ["--json", `^tags:\\s\\[.*${tag}.*\\]`, vault, "-g", "**/*"],
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
    const notes: Note[] = [];
    rgJsons.map((rgJson) => {
      if (rgJson.type === "match") {
        const notePath = rgJson.data.path.text;
        const title = getNoteTitle(notePath);
        const name = path.basename(notePath);
        let note: Note = {
          path: notePath,
          name,
          vault,
        };
        if (title !== "") {
          note = {
            ...note,
            title,
          };
        }
        notes.push(note);
      }
    });
    return notes;
  }
}

const getNoteTitle = (note: string) => {
  const regex = /^title:\s(.*)$/;
  const result = new Deno.Command("rg", {
    args: ["--json", "^title:\\s(.*)$", note],
  });
  const { success, stdout } = result.outputSync();
  if (!success) {
    return "";
  } else {
    let title = "";
    const rgJsons = new TextDecoder().decode(stdout)
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line))
      .filter(isRgJsonMatch);
    rgJsons.map((rgJson) => {
      if (rgJson.type === "match") {
        const matches = rgJson.data.submatches[0].match.text.match(regex);
        if (matches) {
          title = matches[1];
        }
      }
    });
    return title;
  }
};

export class Source extends BaseSource<Params> {
  override kind = "file";

  override gather(
    args: GatherArguments<Params>,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      start(controller) {
        const tag = u.ensure(
          args.sourceParams?.tag,
          u.isOptionalOf(u.isString),
        );
        let notes: Note[] = [];
        const vault = Deno.env.get("HOME") + "/zettelkasten";
        if (tag) {
          notes = getNotesWithTag(vault, tag);
        } else {
          notes = getNotes(vault);
        }
        const items: Item<ActionData>[] = [];
        notes.map((note) => {
          const relativePath = path.relative(vault, note.path);
          items.push({
            word: `${relativePath} | ${note.title ?? note.path}`,
            action: {
              cmd: "rg",
              path: note.path,
              lineNr: 0,
              name: note.path,
              desc: "",
              summary: "",
              note,
              up_to_date: true,
              location: {
                line: 0,
                column: 0,
                taskfile: "",
              },
            },
          });
        });
        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override actions: Actions<Params> = {
    async appendLink(args: ActionArguments<Params>) {
      for (const item of args.items) {
        if (item.action) {
          const action = item?.action as ActionData;
          let linkPath: string;
          const currentFilePath = await fn.expand(args.denops, "%:p") as string;
          const currentFileDir = path.dirname(currentFilePath);
          const noteDir = path.dirname(action.note.path);
          if (currentFileDir === noteDir) {
            linkPath = path.basename(action.note.path);
          } else {
            linkPath = path.relative(currentFileDir, action.note.path);
          }
          const link = `[${action.note.title ?? "No title"}](${linkPath})`;
          await paste(args.denops, args.context.mode, link, "p");
        }
      }
      return ActionFlags.None;
    },
  };

  override params(): Params {
    return {};
  }
}
