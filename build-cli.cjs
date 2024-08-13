const { writeFileSync, readFileSync } = require("fs");
const { formatMessages } = require("esbuild");
const esbuild = require("esbuild");

async function main() {
  const debug = process.env.DEBUG === "true";
  const version = require("./package.json").version;
  const result = await esbuild.build({
    entryPoints: ["src/cli/index.ts"],
    minify: !debug,
    bundle: true,
    platform: "node",
    outfile: "dist/cli/index.js",
    target: "node20",
    sourcemap: debug,
    define: {
      __VERSION__: `"${version}"`,
      __DEBUG__: debug ? "true" : "false",
    },
  });
  if (result.warnings.length) {
    result.warnings.forEach((warning) => {
      console.log(formatMessages([warning], { kind: "warning" }));
    });
  }
  if (result.errors.length) {
    result.errors.forEach((error) => {
      console.log(formatMessages([error], { kind: "error" }));
    });
    process.exit(1);
  }
  // generate package.json
  const packageJson = {
    name: "@themoin/diff-calculator-cli",
    version,
    repository: {
      type: "git",
      url: "https://github.com/themoin/diff-calculator.git",
    },
    description:
      "CLI for aggregating diff between two revisions, which can ignore deletions, whitespaces and comments",
    bin: {
      calcdiff: "./index.js",
    },
    files: ["index.js"],
    keywords: [
      "diff",
      "comment",
      "whitespace",
      "deletion",
      "ignore",
      "calculator",
      "git",
    ],
    author: "haenah",
    license: "MIT",
  };
  writeFileSync("dist/cli/package.json", JSON.stringify(packageJson, null, 2));
  const readme = readFileSync("README.md", "utf-8").replace(
    /\{version\}/g,
    `v${version}`,
  );
  writeFileSync("dist/cli/README.md", readme);
}

main();
