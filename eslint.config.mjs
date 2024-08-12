import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  { ignores: ["dist/**"] },
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.node } },
  { plugins: { "unused-imports": eslintPluginUnusedImports } },
  pluginJs.configs.recommended,
  ...tseslint.configs.strict,
  eslintPluginPrettierRecommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];

export default config;
