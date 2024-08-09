import * as core from "@actions/core";
import { calculateDiffSize } from "../lib/calculateDiffSize";

async function main() {
  try {
    const source = core.getInput("source", {
      required: true,
      trimWhitespace: true,
    });
    const target = core.getInput("target", {
      required: true,
      trimWhitespace: true,
    });
    const ignoreFilePath =
      core.getInput("gitdiffignore-directory", {
        required: false,
        trimWhitespace: true,
      }) || undefined;
    const verbose =
      core.getInput("verbose", {
        required: false,
        trimWhitespace: true,
      }) === "true";
    const ignoreDeletion =
      core.getInput("ignore-deletion", {
        required: false,
        trimWhitespace: true,
      }) === "true";
    const ignoreWhitespace =
      core.getInput("ignore-whitespace", {
        required: false,
        trimWhitespace: true,
      }) === "true";
    const ignoreComment =
      core.getInput("ignore-comment", {
        required: false,
        trimWhitespace: true,
      }) === "true";
    const size = await calculateDiffSize({
      log: core.info,
      source,
      target,
      ignoreFilePath,
      verbose,
      ignoreDeletion,
      ignoreWhitespace,
      ignoreComment,
    });
    core.setOutput("size", size);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error);
    } else {
      core.setFailed("An unknown error occurred.");
    }
  }
}

main();
