import fs from "fs";

class Range {
  constructor(
    public start: number,
    public end: number,
  ) {}
  public contains(lineNo: number) {
    return this.start <= lineNo && lineNo <= this.end;
  }
}

export class CommentChecker {
  constructor(private path: string) {
    this.multilineCommentRanges = [];
    const file = fs.readFileSync(this.path).toString().split("\n");
    let start: number | null = null;
    for (let i = 0; i < file.length; i++) {
      const trimmed = file[i].trim();
      if (start === null) {
        switch (trimmed.indexOf("/*")) {
          case -1:
            break;
          case 0:
            start = i;
            break;
          default:
            start = i + 1;
        }
      }
      if (start !== null) {
        switch (trimmed.indexOf("*/")) {
          case -1:
            break;
          case trimmed.length - 2:
            this.multilineCommentRanges.push(new Range(start, i));
            start = null;
            break;
          default:
            this.multilineCommentRanges.push(new Range(start, i - 1));
            break;
        }
      }
    }
  }
  private multilineCommentRanges: Range[];
  public check(lineNo: number, lineContent: string) {
    if (this.multilineCommentRanges.some((range) => range.contains(lineNo))) {
      return false;
    }
    if (lineContent.trim().startsWith("//")) {
      return false;
    }
    if (lineContent.trim().startsWith("#")) {
      return false;
    }
    return true;
  }
}
