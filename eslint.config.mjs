import js from "@eslint/js";
import globals from "globals";
import mochaPlugin from "eslint-plugin-mocha";

export default [
  {
    ignores: ["coverage/**", "node_modules/**"],
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: "module",
      ecmaVersion: "latest",
    },
    rules: { ...js.configs.recommended.rules },
  },
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: "commonjs",
      ecmaVersion: "latest",
    },
    rules: { ...js.configs.recommended.rules },
  },
  {
    files: ["spec/**/*.spec.js"],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.node,
        expect: "readonly",

      },
      sourceType: "commonjs",
      ecmaVersion: "latest",
    },
    plugins: { mocha: mochaPlugin },
    rules: {
      ...mochaPlugin.configs.recommended.rules,
    },
  },
];