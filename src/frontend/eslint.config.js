import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "public/mockServiceWorker.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // 컴포넌트에서 fetch 직접 호출 금지 — api/client.ts 하나로만 (phase3_task.md 1.5)
      "no-restricted-globals": ["error", { name: "fetch", message: "api/client.ts의 request()를 쓰세요." }],
    },
  },
  { files: ["scripts/**/*.mjs", "*.js"], languageOptions: { globals: { ...globals.node } } },
  {
    files: ["src/api/client.ts", "src/mocks/**", "e2e/**", "src/test/**"],
    rules: { "no-restricted-globals": "off" },
  },
);
