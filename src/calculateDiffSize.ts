import { exec } from "child_process";
import fs from "fs";
import path from "path";

import gitDiffParser from "gitdiff-parser";
import { minimatch } from "minimatch";

import { dim, error, info, success } from "./shellUtils.js";

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
    const linesToPrint = [];
    let lines = 0;
    for (const hunk of file.hunks) {
      let multilineComment = false;
      for (const change of hunk.changes) {
        switch (change.type) {
          case "delete":
            if (ignoreDeletion) continue;
            if (log) linesToPrint.push(error(change.content));
            break;
          case "normal":
            if (log) linesToPrint.push(dim(change.content));
            continue;
        }
        const content = change.content.trim();
        if (!content) {
          if (log) linesToPrint.push(dim(change.content));
          if (ignoreWhitespace) continue;
        }
        // 여러 줄짜리 주석 제외
        if (content.startsWith("/*")) multilineComment = true;
        if (change.content.endsWith("*/")) {
          if (log) linesToPrint.push(dim(change.content));
          multilineComment = false;
          continue;
        }
        if (multilineComment) {
          if (log) linesToPrint.push(dim(change.content));
          continue;
        }
        // 단일 주석 제외
        if (content.startsWith("//") || content.startsWith("#")) {
          if (log) linesToPrint.push(dim(change.content));
          continue;
        }
        if (log) linesToPrint.push(success(change.content));
        lines++;
      }
    }
    diffs += lines;
    if (log) {
      log(info(`📄 ${file.newPath} ${success(`+${lines}`)}`));
      if (verbose) {
        log(linesToPrint.join("\n"));
        log("");
      }
    }
  }
  return diffs;
}
