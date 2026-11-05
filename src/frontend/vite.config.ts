import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": r("./src"),
      "@seed": r("../../data/seed"),
      "@fixtures": r("../tests/fixtures"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // Backend만 호출한다 (CLAUDE.md 4.2). 같은 출처로 붙여 httpOnly 쿠키가 따라가게 한다.
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: false } },
    fs: { allow: [r("../..")] },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    testTimeout: 15000,
  },
});
