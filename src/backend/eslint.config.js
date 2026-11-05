import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.node } },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] },
  },
  prettier,
];
