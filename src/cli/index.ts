#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { calculateDiffSize } from "../lib/calculateDiffSize";
import { success } from "./shellUtils";

yargs(hideBin(process.argv))
  .positional("sourceBranch", {
    default: "HEAD",
    description: "The source branch",
    type: "string",
  })
  .positional("targetBranch", {
    description: "The target branch",
    type: "string",
  })
  .option("ignoreFilePath", {
    alias: "f",
    required: false,
    description:
      "The file path of what files to ignore. If not provided, the .gitdiffignore file in working directory will be used.",
    type: "string",
  })
  .option("ignoreDeletion", {
    alias: "d",
    default: false,
    description: "Whether to ignore deleted lines",
    type: "boolean",
  })
  .option("ignoreWhitespace", {
    alias: "w",
    default: false,
    description: "Whether to ignore white space",
    type: "boolean",
  })
  .option("ignoreComment", {
    alias: "c",
    default: false,
    description: "Whether to ignore comments",
    type: "boolean",
  })
  .option("verbose", {
    alias: "v",
    default: false,
    description: "Whether to print diff details",
    type: "boolean",
  })
  .option("quiet", {
    alias: "q",
    default: false,
    description: "Whether to log only the number of total diff lines",
    type: "boolean",
  })
  .command(
    "$0 <targetBranch> [sourceBranch]",
    "Get the size of the diff between the source branch and the target branch.",
    () => {},
    async (argv) => {
      const diffs = await calculateDiffSize({
        source: argv.sourceBranch,
        target: argv.targetBranch!,
        ignoreFilePath: argv.ignoreFilePath,
        log: argv.quiet ? undefined : console.log,
        verbose: argv.verbose,
        ignoreDeletion: argv.ignoreDeletion,
        ignoreWhitespace: argv.ignoreWhitespace,
        ignoreComment: argv.ignoreComment,
      });
      if (argv.quiet) {
        console.log(diffs);
      } else {
        console.log(`📊 Total diff lines: ${success(diffs)}`);
      }
    },
  )
  .version(false)
  .parse();
