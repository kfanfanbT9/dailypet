import { execSync } from "node:child_process";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Demo!2345";
export const EMAILS = {
  haneul: "haneul@demo.dailypet",
  seojun: "seojun@demo.dailypet",
  jiwoo: "jiwoo@demo.dailypet",
  youngja: "youngja@demo.dailypet",
} as const;

/** 데모 데이터를 시드로 되돌린다 (npm run seed:reset, 약 3초) */
export function seedReset() {
  execSync("npm run -s seed:reset", { cwd: resolve(import.meta.dirname, "../../backend"), stdio: "pipe" });
}

/** 비밀번호 입력칸 ("비밀번호 보기" 버튼과 구분) */
export const passwordInput = (page: Page) => page.getByLabel("비밀번호").and(page.locator("input"));

export async function login(page: Page, who: keyof typeof EMAILS, path = "/") {
  await page.goto(`/login?next=${encodeURIComponent(path)}`);
  await page.getByLabel("이메일").fill(EMAILS[who]);
  await passwordInput(page).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    localStorage.setItem("dp.theme", t);
    document.documentElement.dataset.theme = t;
  }, theme);
}

export async function expectNoA11yViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(sw).toBeLessThanOrEqual(cw);
}
