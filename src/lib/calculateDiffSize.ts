import { exec } from "child_process";
import fs from "fs";
import path from "path";

import { bold, dim, error, info, success } from "../utils/shellUtils";
import { getCommentSyntax } from "./getCommetSyntax";
import { createCommentChecker } from "./createCommentChecker";
import { createInterface } from "readline";
import { parseGitDiff } from "./parseGitDiff";

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
  const execArgs = ["git diff --no-color"];
  execArgs.push(`${mergeBase}..${source}`);
  if (ignoreWhitespace) execArgs.push("-w");
  if (ignoreDeletion) execArgs.push("--diff-filter=ACMR");
  if (ignoreFileGlobs.length)
    execArgs.push(...ignoreFileGlobs.map((pattern) => `":!${pattern}"`));
  const gitDiffProc = exec(execArgs.join(" "));
  if (!gitDiffProc.stdout) throw new Error("Failed to get git diff");
  gitDiffProc.stderr?.on("data", (data) => {
    console.error(error(data.toString()));
    process.exit(1);
  });
  const parsedDiffStream = parseGitDiff(
    createInterface({ input: gitDiffProc.stdout })[Symbol.asyncIterator](),
  );

  let diffs = 0;
  for await (const file of parsedDiffStream) {
    if (file.isBinary) continue;
    const oldFileCommentChecker = await (() => {
      if (!ignoreComment) return undefined;
      const ext = path.basename(file.oldPath).split(".").pop();
      if (!ext) return undefined;
      const commentSyntax = getCommentSyntax(ext);
      if (!commentSyntax) return undefined;
      const gitShowProcess = exec(`git show ${mergeBase}:${file.oldPath}`);
      if (!gitShowProcess.stdout)
        throw new Error("Failed to get old file content");
      return createCommentChecker(
        createInterface({ input: gitShowProcess.stdout }),
        commentSyntax,
      );
    })();
    const newFileCommentChecker = await (() => {
      if (!ignoreComment) return undefined;
      const ext = path.basename(file.newPath).split(".").pop();
      if (!ext) return undefined;
      const commentSyntax = getCommentSyntax(ext);
      if (!commentSyntax) return undefined;
      const gitShowProcess = exec(`git show ${source}:${file.newPath}`);
      if (!gitShowProcess.stdout)
        throw new Error("Failed to get new file content");
      return createCommentChecker(
        createInterface({ input: gitShowProcess.stdout }),
        commentSyntax,
      );
    })();

    const linesToPrint = [];
    let insertion = 0;
    let deletion = 0;
    for (const hunk of file.hunks) {
      if (verbose) linesToPrint.push(info(bold(hunk.header)));
      for (const change of hunk.lines) {
        switch (change.type) {
          case "-":
            if (ignoreDeletion) continue;
            break;
          case " ":
            linesToPrint.push(dim(change.content));
            continue;
        }
        const trimmed = change.content.slice(1).trim();
        if (!trimmed && ignoreWhitespace) {
          linesToPrint.push(dim(change.content));
          continue;
        }
        if (change.type === "+") {
          if (trimmed && newFileCommentChecker?.(change.lineNo)) {
            linesToPrint.push(dim(change.content));
            continue;
          } else {
            linesToPrint.push(success(change.content));
            insertion++;
          }
        } else {
          if (trimmed && oldFileCommentChecker?.(change.lineNo)) {
            linesToPrint.push(dim(change.content));
            continue;
          } else {
            linesToPrint.push(error(change.content));
            deletion++;
          }
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
