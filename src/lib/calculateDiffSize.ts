import { exec } from "child_process";
import fs from "fs";
import path from "path";

import gitDiffParser from "gitdiff-parser";

import { bold, dim, error, info, success } from "../utils/shellUtils.js";
import { MultilineCommentChecker } from "./MultilineCommentChecker.js";

export type CalculateDiffSizeOptions = {
  log?: (message: string) => void;
  verbose: boolean;
  source: string;
  target: string;
  ignoreFilePath?: string;
  ignoreDeletion: boolean;
  ignoreWhitespace: boolean;
  ignoreComment: boolean;
};

export async function calculateDiffSize({
  log,
  verbose,
  source,
  target,
  ignoreDeletion,
  ignoreFilePath = path.join(process.cwd(), ".gitdiffignore"),
  ignoreWhitespace,
  ignoreComment,
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
  const mergeBase: string = await new Promise((resolve, reject) => {
    const execArgs = ["git merge-base"];
    execArgs.push(source);
    execArgs.push(target);
    exec(execArgs.join(" "), (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
  const diff: string = await new Promise((resolve, reject) => {
    const execArgs = ["git diff"];
    execArgs.push(`${mergeBase}..${source}`);
    if (ignoreWhitespace) execArgs.push("-w");
    if (ignoreDeletion) execArgs.push("--diff-filter=ACMR");
    if (ignoreFileGlobs.length)
      execArgs.push(...ignoreFileGlobs.map((pattern) => `":!${pattern}"`));
    exec(execArgs.join(" "), (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
  const files = gitDiffParser.parse(diff).filter((file) => {
    if (file.isBinary) return false;
    return true;
  });

  // 추가된 줄 수 계산
  let diffs = 0;
  for (const file of files) {
    const oldFileContent: string | null = await new Promise(
      (resolve, reject) => {
        if (file.type === "add") return resolve(null);
        exec(`git show ${mergeBase}:${file.oldPath}`, (err, stdout) => {
          if (err) reject(err);
          else resolve(stdout);
        });
      },
    );
    const newFileContent: string = await new Promise((resolve, reject) => {
      if (file.type === "delete") return resolve("");
      exec(`git show ${source}:${file.newPath}`, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
    const oldFileCommentChecker =
      ignoreComment && oldFileContent
        ? new MultilineCommentChecker(oldFileContent)
        : undefined;
    const newFileCommentChecker =
      ignoreComment && newFileContent
        ? new MultilineCommentChecker(newFileContent)
        : undefined;
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
        switch (change.type) {
          case "delete":
            if (ignoreDeletion) continue;
            break;
          case "normal":
            linesToPrint.push(dim(change.content));
            continue;
        }
        const content = change.content.trim();
        if (!content) {
          linesToPrint.push(dim(change.content));
          if (ignoreWhitespace) continue;
        }
        if (ignoreComment) {
          if (change.type === "insert") {
            if (newFileCommentChecker!.isComment(change.lineNumber)) {
              linesToPrint.push(dim(change.content));
              continue;
            }
          } else {
            if (oldFileCommentChecker!.isComment(change.lineNumber)) {
              linesToPrint.push(dim(change.content));
              continue;
            }
          }
          if (content.startsWith("//") || content.startsWith("#")) {
            linesToPrint.push(dim(change.content));
            continue;
          }
        }
        if (change.type === "insert") {
          linesToPrint.push(success(change.content));
          insertion++;
        } else {
          linesToPrint.push(error(change.content));
          deletion++;
        }
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
