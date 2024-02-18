import {
  BaseSource,
  GatherArguments,
  Item,
  path,
  unknownutil as u,
} from "./deps.ts";

import { ActionData, isRgJsonMatch, Note } from "./types.ts";

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
      if (title !== "") {
        notes.push({
          title,
          path: notePath,
          name,
        });
      } else {
        notes.push({
          path: notePath,
          name,
        });
      }
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
        if (title !== "") {
          notes.push({
            title,
            path: notePath,
            name,
          });
        } else {
          notes.push({
            path: notePath,
            name,
          });
        }
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
          items.push({
            word: `${note.name} | ${note.title ?? note.path}`,
            action: {
              cmd: "rg",
              path: note.path,
              lineNr: 0,
              name: note.path,
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
        });
        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}
