import * as core from "@actions/core";
import { calculateDiffSize } from "./calculateDiffSize";

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
    const directoryOfIgnoreFile =
      core.getInput("gitdiffignore-directory", {
        required: false,
        trimWhitespace: true,
      }) || ".";
    const verbose =
      core.getInput("verbose", {
        required: false,
        trimWhitespace: true,
      }) === "true";
    const size = await calculateDiffSize({
      log: core.info,
      source,
      target,
      directoryOfIgnoreFile,
      verbose,
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
