class Range {
  constructor(
    public start: number,
    public end: number,
  ) {}
  public contains(lineNo: number) {
    return this.start <= lineNo && lineNo <= this.end;
  }
}

export class MultilineCommentChecker {
  constructor(fileContent: string, prefix: string, suffix: string) {
    this.multilineCommentRanges = [];
    let start: number | null = null;
    const file = fileContent.split("\n");
    for (let i = 0; i < file.length; i++) {
      const trimmed = file[i].trim();
      if (start === null) {
        switch (trimmed.indexOf(prefix)) {
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
        switch (trimmed.indexOf(suffix)) {
          case -1:
            break;
          case trimmed.length - suffix.length:
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
  public isComment(lineNo: number) {
    return this.multilineCommentRanges.some((range) => range.contains(lineNo));
  }
}
