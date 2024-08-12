import { CommentSyntax } from "./getCommetSyntax";

class Range {
  constructor(
    public start: number,
    public end: number,
  ) {}
}

export async function createCommentChecker(
  fileLines: AsyncIterable<string>,
  syntax: CommentSyntax,
) {
  const ranges: Range[] = [];
  const singleLineCommentLineNos: Set<number> = new Set();
  let start: number | null = null;
  let lineNo = 0;
  for await (const line of fileLines) {
    lineNo++;
    const trimmed = line.trim();
    if (syntax.multiLine) {
      if (start === null) {
        switch (trimmed.indexOf(syntax.multiLine.prefix)) {
          case -1:
            break;
          case 0:
            start = lineNo;
            break;
          default:
            start = lineNo + 1;
        }
      }
      if (start !== null) {
        switch (trimmed.indexOf(syntax.multiLine.suffix)) {
          case -1:
            break;
          case trimmed.length - syntax.multiLine.suffix.length:
            ranges.push(new Range(start, lineNo));
            start = null;
            break;
          default:
            ranges.push(new Range(start, lineNo - 1));
            start = null;
            break;
        }
      }
    }
    if (syntax.singleLine) {
      if (Array.isArray(syntax.singleLine)) {
        if (syntax.singleLine.some((syntax) => trimmed.startsWith(syntax))) {
          singleLineCommentLineNos.add(lineNo);
        }
      } else {
        if (trimmed.startsWith(syntax.singleLine)) {
          singleLineCommentLineNos.add(lineNo);
        }
      }
    }

    function isMultiLineComment(lineNo: number) {
      if (ranges.length === 0) {
        return false;
      }
      // binary search
      function isMultiLineCommentRec(start: number, end: number): boolean {
        if (start > end) {
          return false;
        }
        const mid = Math.floor((start + end) / 2);
        const range = ranges[mid];
        if (range.start <= lineNo && lineNo <= range.end) {
          return true;
        }
        if (lineNo < range.start) {
          return isMultiLineCommentRec(start, mid - 1);
        }
        return isMultiLineCommentRec(mid + 1, end);
      }
      return isMultiLineCommentRec(0, ranges.length - 1);
    }

    function isSingleLineComment(lineNo: number) {
      return singleLineCommentLineNos.has(lineNo);
    }

    if (syntax.multiLine && syntax.singleLine) {
      return isMultiLineComment;
    }
    if (syntax.multiLine) {
      return isMultiLineComment;
    }
    if (syntax.singleLine) {
      return isSingleLineComment;
    }
    return () => false;
  }
}
