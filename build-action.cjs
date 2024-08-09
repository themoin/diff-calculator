const { writeFileSync, readFileSync, copyFileSync } = require("fs");
const { formatMessages } = require("esbuild");
const esbuild = require("esbuild");

async function main() {
  const result = await esbuild.build({
    entryPoints: ["src/action/index.ts"],
    minify: true,
    bundle: true,
    platform: "node",
    outfile: "dist/action/index.js",
    target: "node20",
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
  // copy action.yaml
  const actionYaml = readFileSync("action-template.yaml", "utf-8").replace(
    /\{version\}/g,
    require("./package.json").version,
  );
  writeFileSync("dist/action/action.yaml", actionYaml);
  // copy README.md
  const packageJsonVersion = require("./package.json").version;
  const readme = readFileSync("README.md", "utf-8").replace(
    /\{version\}/g,
    packageJsonVersion,
  );
  writeFileSync("dist/action/README.md", readme);
}

main();
