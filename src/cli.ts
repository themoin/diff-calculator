#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { calculateDiffSize } from "./calculateDiffSize";
import { success } from "./shellUtils";
import { error } from "console";

yargs(hideBin(process.argv))
  .option("quiet", {
    alias: "q",
    default: false,
    description: "최종 결과만 출력합니다.",
    type: "boolean",
  })
  .option("verbose", {
    alias: "v",
    default: false,
    description: "변경사항을 자세히 출력합니다.",
    type: "boolean",
  })
  .option("ignoreFilePath", {
    alias: "f",
    required: false,
    description:
      "ignore 파일이 위치한 경로. 없을 경우 루트 디렉토리의 .gitdiffignore를 사용합니다.",
    type: "string",
  })
  .option("maxDiff", {
    alias: "m",
    default: 300,
    description:
      "실패로 간주할 추가된 line 수. 0 입력시 실패로 간주하지 않습니다.",
    type: "number",
  })
  .option("ignoreDeletion", {
    alias: "d",
    default: false,
    description: "삭제된 변경사항을 제외합니다.",
    type: "boolean",
  })
  .positional("targetBranch", {
    description: "기준 브랜치",
    type: "string",
  })
  .positional("sourceBranch", {
    default: "HEAD",
    description: "비교할 브랜치",
    type: "string",
  })
  .command(
    "$0 <targetBranch> [sourceBranch]",
    "targetBranch와 비교하여 실질적으로 추가된 line 수를 계산합니다.",
    () => {},
    async (argv) => {
      const diffs = await calculateDiffSize({
        source: argv.sourceBranch,
        target: argv.targetBranch!,
        ignoreFilePath: argv.ignoreFilePath,
        log: argv.quiet ? undefined : console.log,
        verbose: argv.verbose,
        ignoreDeletion: argv.ignoreDeletion,
      });
      if (argv.quiet) {
        console.log(diffs);
      } else {
        console.log(`📊 총 추가된 line 수: ${success(diffs)}`);
      }
      if (argv.maxDiff && diffs > argv.maxDiff) {
        console.error(
          error(`❌ 추가된 line 수가 ${argv.maxDiff} line을 초과했습니다.`),
        );
        process.exit(1);
      }
    },
  )
  .version(false)
  .parse();
