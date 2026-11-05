// E2E: 실제 Backend(:3000) + Vite(:5173) + Chroma(:8001, 먼저 실행) + Agent(:8000, 먼저 실행).
// Backend는 이 설정이 띄운다. JWT_SECRET은 E2E 전용 값을 프로세스 환경으로만 넘긴다 (.env는 건드리지 않음).
// 테스트마다 seed:reset (e2e/helpers.ts). 기준일은 시나리오와 같은 2026-11-10.
import { defineConfig, devices } from "@playwright/test";

export const E2E_TODAY = "2026-11-10";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: false,
  workers: 1, // 같은 Chroma 데모 데이터를 쓰므로 순서대로
  timeout: 60_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  reporter: [["list"]],
  use: { baseURL: "http://localhost:5173", trace: "retain-on-failure", locale: "ko-KR", timezoneId: "Asia/Seoul" },
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    {
      command: "node src/server.js",
      cwd: "../backend",
      url: "http://localhost:3000/health",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { JWT_SECRET: "e2e-local-only-secret", TODAY_OVERRIDE: E2E_TODAY },
      stdout: "pipe",
    },
    { command: "npm run dev -- --port 5173 --strictPort", url: "http://localhost:5173", reuseExistingServer: false, timeout: 60_000 },
  ],
});
