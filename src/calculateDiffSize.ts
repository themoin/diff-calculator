import { exec } from "child_process";
import fs from "fs";
import path from "path";

import gitDiffParser from "gitdiff-parser";
import { minimatch } from "minimatch";

import { bold, dim, error, info, success } from "./shellUtils.js";
import { CommentChecker } from "./CommentChecker.js";

export type CalculateDiffSizeOptions = {
  log?: (message: string) => void;
  verbose: boolean;
  source: string;
  target: string;
  ignoreFilePath?: string;
  ignoreDeletion: boolean;
  ignoreWhitespace: boolean;
};

export async function calculateDiffSize({
  log,
  verbose,
  source,
  target,
  ignoreDeletion,
  ignoreFilePath = path.join(process.cwd(), ".gitdiffignore"),
  ignoreWhitespace,
}: CalculateDiffSizeOptions) {
  // 제외될 파일 계산
  let ignoreFileGlobs: string[] = [];
  if (fs.existsSync(ignoreFilePath)) {
    ignoreFileGlobs = fs
      .readFileSync(ignoreFilePath, "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"));
  }
  const diff: string = await new Promise((resolve, reject) => {
    const execArgs = ["git diff"];
    execArgs.push(`${target}...${source}`);
    if (ignoreWhitespace) execArgs.push("-w");
    if (ignoreDeletion) execArgs.push("--diff-filter=ACMR");
    if (ignoreFileGlobs.length)
      execArgs.push(...ignoreFileGlobs.map((pattern) => `":!${pattern}"`));
    exec(execArgs.join(" "), (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
  const files = gitDiffParser.parse(diff).filter((file) => {
    if (file.isBinary) return false;
    if (ignoreFileGlobs.some((pattern) => minimatch(file.newPath, pattern)))
      return false;
    return true;
  });

  // 추가된 줄 수 계산
  let diffs = 0;
  for (const file of files) {
    const commentChecker = new CommentChecker(file.newPath);
    const linesToPrint = [];
    let insertion = 0;
    let deletion = 0;
    for (const hunk of file.hunks) {
      if (verbose)
        linesToPrint.push(
          bold(
            ignoreDeletion
              ? `From line ${hunk.newStart} to ${hunk.newStart + hunk.newLines - 1}`
              : `From line ${hunk.oldStart} to ${hunk.oldStart + hunk.oldLines - 1} ➡ From line ${hunk.newStart} to ${hunk.newStart + hunk.newLines - 1}`,
          ),
        );
      for (const change of hunk.changes) {
        let isInsertionOrDeletion = true;
        switch (change.type) {
          case "delete":
            if (ignoreDeletion) continue;
            isInsertionOrDeletion = false;
            break;
          case "normal":
            linesToPrint.push(dim(change.content)); /*
            /*
            */
            continue;
        }
        const content = change.content.trim();
        if (!content) {
          linesToPrint.push(dim(change.content));
          if (ignoreWhitespace) continue;
        }
        if (
          ignoreDeletion &&
          !commentChecker.check(change.lineNumber, content)
        ) {
          linesToPrint.push(dim(change.content));
          continue;
        }
        linesToPrint.push(
          (isInsertionOrDeletion ? success : error)(change.content),
        );
        if (isInsertionOrDeletion) insertion++;
        else deletion++;
      }
    }
    diffs += insertion + deletion;
    if (log && insertion + deletion) {
      log(
        info(
          bold(
            `📄 ${file.newPath}${deletion ? error(` -${deletion}`) : ""}${insertion ? success(` +${insertion}`) : ""}`,
          ),
        ),
      );
      if (verbose) {
        log(linesToPrint.join("\n"));
        log("");
      }
    }
  }
  return diffs;
}
