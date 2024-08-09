const { formatMessages } = require("esbuild");
const esbuild = require("esbuild");

async function main() {
  const result = await esbuild.build({
    entryPoints: ["src/action/index.ts"],
    minify: true,
    bundle: true,
    platform: "node",
    outfile: "action.js",
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
}

main();
