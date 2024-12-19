      hunks: AsyncIterable<Hunk>;
export async function* parseGitDiff(
): AsyncIterable<FileDiff> {
    yield parsed;
  return {
    ...fileInfo,
    isBinary: false,
    hunks: (async function* () {
      if (await parseHunkPath(scanner)) {
        while (true) {
          const hunk = await parseHunk(scanner);
          if (!hunk) break;
          yield hunk;
        }
      }
    })(),
  };