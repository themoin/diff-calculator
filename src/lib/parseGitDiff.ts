type FileInfo = {
  type: "A" | "M" | "D" | "C" | "R";
  oldPath: string;
  newPath: string;
};

type ContentInfo =
  | {
      hunks: Hunk[];
      isBinary: false;
    }
  | {
      hunks?: never;
      isBinary: true;
    };

export type FileDiff = FileInfo & ContentInfo;

export type Hunk = {
  header: string;
  lines: Line[];
};

export type Line =
  | {
      type: "+" | "-";
      content: string;
      lineNo: number;
    }
  | {
      type: " ";
      content: string;
      lineNo?: never;
    };

class LineScanner {
  private buffer: string | null = null;
  constructor(private lines: AsyncIterator<string>) {}
  /** Do not consume, just peek the first line from the scanner cursor */
  async peek() {
    if (this.buffer) return this.buffer;
    const next = await this.lines.next();
    if (next.done) return null;
    this.buffer = next.value;
    return this.buffer;
  }
  /** Consume */
  async scan() {
    const line = await this.peek();
    this.buffer = null;
    return line;
  }
}

/**
 * @see https://git-scm.com/docs/git-diff
 */
export async function parseGitDiff(
  lines: AsyncIterator<string>,
): Promise<FileDiff[]> {
  const fileDiffs: FileDiff[] = [];
  const scanner = new LineScanner(lines);
  while (true) {
    const parsed = await parseFileDiff(scanner);
    if (!parsed) break;
    fileDiffs.push(parsed);
  }
  return fileDiffs;
}

async function parseFileDiff(scanner: LineScanner): Promise<FileDiff | null> {
  const line = await scanner.peek();
  if (!line) return null;
  if (line[0] !== "d") {
    throw new Error("Expected diff line");
  }
  // diff --git a/<old-path> b/<new-path>
  await scanner.scan();
  const [, , oldPath, newPath] = line.split(" ");
  const type = await parseFileHeader(scanner);
  const fileInfo: FileInfo = {
    type,
    oldPath: oldPath.slice(2),
    newPath: newPath.slice(2),
  };
  const isBinary = await parseBinary(scanner);
  if (isBinary) return { ...fileInfo, isBinary: true };
  const hunks: Hunk[] = [];
  if (await parseHunkPath(scanner)) {
    while (true) {
      const hunk = await parseHunk(scanner);
      if (!hunk) break;
      hunks.push(hunk);
    }
  }
  return { ...fileInfo, hunks, isBinary: false };
}

async function parseFileHeader(
  scanner: LineScanner,
): Promise<FileInfo["type"]> {
  let fileDiffType: FileInfo["type"] | null = null;
  loop: while (true) {
    const line = await scanner.peek();
    switch (line?.[0]) {
      case "n":
        // new file mode <mode>
        await scanner.scan();
        if (fileDiffType && fileDiffType !== "A")
          throw new Error("Invalid file type: " + fileDiffType);
        fileDiffType = "A";
        break;
      case "d":
        switch (line[1]) {
          case "e":
            // deleted file mode <mode>
            await scanner.scan();
            if (fileDiffType && fileDiffType !== "D")
              throw new Error("Invalid file type: " + fileDiffType);
            fileDiffType = "D";
            break;
          case "i":
            switch (line[2]) {
              case "f":
                // next diff, so break
                break loop;
              default:
                // dissimilarity index <number>
                await scanner.scan();
            }
        }
        break;
      case "c":
        // copy from/to <path>
        if (fileDiffType && fileDiffType !== "C")
          throw new Error("Invalid file type: " + fileDiffType);
        fileDiffType = "C";
        await scanner.scan();
        break;
      case "r":
        // rename from/to <path>
        if (fileDiffType && fileDiffType !== "R")
          throw new Error("Invalid file type: " + fileDiffType);
        fileDiffType = "R";
        await scanner.scan();
        break;
      case "s":
        // similarity index <number>
        await scanner.scan();
        break;
      case "i":
        // index <hash>..<hash> <mode>
        if (!fileDiffType) fileDiffType = "M";
        await scanner.scan();
        break;
      default:
        break loop;
    }
  }
  if (!fileDiffType) throw new Error("Invalid file type");
  return fileDiffType;
}

async function parseBinary(scanner: LineScanner): Promise<boolean> {
  const line = await scanner.peek();
  // Binary files differ
  if (!line || line[0] !== "B") return false;
  await scanner.scan();
  return true;
}

async function parseHunkPath(scanner: LineScanner) {
  const line = await scanner.peek();
  // If scanner is at the end of file, or next `diff --git` line
  if (!line || line[0] === "d") {
    return false;
  }
  // --- a/<path>
  await scanner.scan();
  // +++ b/<path>
  await scanner.scan();
  return true;
}

async function parseHunk(scanner: LineScanner): Promise<Hunk | null> {
  const line = await scanner.peek();
  // If scanner is at the end of file, or hunk does not exist
  if (!line || line[0] !== "@") {
    return null;
  }
  // @@ -<old-start>[,<old-lines>] +<new-start>[,<new-lines>] @@
  const hunkHeader = (await scanner.scan())!;

  const [, _old, _new] = hunkHeader.split(" ");
  const [oldStart] = parseHunkRange(_old);
  const [newStart] = parseHunkRange(_new);
  const hunk: Hunk = {
    header: hunkHeader,
    lines: [],
  };
  let oldLineNo = oldStart;
  let newLineNo = newStart;
  while (true) {
    const line = await scanner.peek();
    // If scanner is at the end of file, or next `diff --git` line, or next hunk
    if (!line || line[0] === "d" || line[0] === "@") break;
    const type = line[0] as Line["type"];
    switch (type) {
      case "+":
        hunk.lines.push({ type, content: line, lineNo: newLineNo });
        newLineNo++;
        break;
      case "-":
        hunk.lines.push({ type, content: line, lineNo: oldLineNo });
        oldLineNo++;
        break;
      case " ":
        hunk.lines.push({ type, content: line });
        oldLineNo++;
        newLineNo++;
        break;
    }
    await scanner.scan();
  }
  return hunk;
}

/**
 * `-<start>[,<lines>]`\
 * if `,<lines>` is omitted, it is 1
 */
function parseHunkRange(range: string): [number, number] {
  const splitted = range.slice(1).split(",");
  if (splitted.length === 1) {
    return [parseInt(splitted[0]), 1];
  }
  return [parseInt(splitted[0]), parseInt(splitted[1])];
}
