import { Denops, fn } from "./deps.ts";

// This code is from Shougo/ddu-kind-word
// Thanks to Shougo
export const paste = async (
  denops: Denops,
  mode: string,
  text: string,
  pasteKey: string,
) => {
  const oldReg = await fn.getreginfo(denops, '"');

  await fn.setreg(denops, '"', text, "v");
  try {
    await denops.cmd('normal! ""' + pasteKey);
  } finally {
    await fn.setreg(denops, '"', oldReg);
  }

  if (mode === "i") {
    // Cursor move
    const textLen = await fn.strlen(denops, text) as number;
    await fn.cursor(denops, 0, await fn.col(denops, ".") + textLen);
  }

  // Open folds
  await denops.cmd("normal! zv");
};
