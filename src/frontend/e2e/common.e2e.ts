// 공통 점검 (phase3_task.md 10장): axe 위반 0건(밝게·밤하늘), 가로 스크롤 없음(375·1280, 200% 확대), 키보드 S03.
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, expectNoHorizontalScroll, login, seedReset, setTheme } from "./helpers";

const SCREENS: { path: string; ready: RegExp | string }[] = [
  { path: "/?pet=pet_bori", ready: /오늘의 할 일/ },
  { path: "/health?pet=pet_bori", ready: "건강 일정" },
  { path: "/weights?pet=pet_bori", ready: "보리 체중 기록" },
  { path: "/chat?pet=pet_bori", ready: "보리와 상담" },
  { path: "/chat/history?pet=pet_bori", ready: "보리 대화 기록" },
  { path: "/preferences?pet=pet_bori", ready: "보리의 취향" },
  { path: "/me?pet=pet_bori", ready: "내 정보" },
  { path: "/pets?pet=pet_bori", ready: "우리 아이들" },
  { path: "/pets/new?pet=pet_bori", ready: /반려동물/ },
];

test.beforeAll(() => seedReset());

for (const theme of ["light", "dark"] as const) {
  test(`모든 화면 axe 위반 0건·가로 스크롤 없음 (${theme})`, async ({ page }) => {
    await login(page, "jiwoo");
    await setTheme(page, theme);
    for (const s of SCREENS) {
      await test.step(s.path, async () => {
        await page.goto(s.path);
        await expect(page.getByRole("heading", { level: 1, name: s.ready }).first()).toBeVisible();
        await page.waitForLoadState("networkidle");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expectNoA11yViolations(page);
        await expectNoHorizontalScroll(page);
      });
    }
  });
}

test("로그인·가입 화면 axe·가로 스크롤", async ({ page }) => {
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectNoA11yViolations(page);
    await expectNoHorizontalScroll(page);
  }
});

test("200% 확대에서도 가로 스크롤 없음", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "데스크톱 폭에서 확대 (1280 → 실효 640)");
  await login(page, "jiwoo");
  await page.setViewportSize({ width: 640, height: 400 }); // 1280px 창의 200% 확대와 같은 CSS 폭
  for (const s of SCREENS.slice(0, 7)) {
    await page.goto(s.path);
    await expect(page.getByRole("heading", { level: 1, name: s.ready }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});

test("키보드만으로 S03: 로그인 → 할 일 완료 → 알림 시트", async ({ page }) => {
  seedReset();
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("이메일")).toBeFocused();
  await page.keyboard.type("haneul@demo.dailypet");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Demo!2345");
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  const box = page.getByRole("checkbox").first();
  await expect(box).toBeVisible();
  // 첫 체크박스까지 Tab으로 이동
  for (let i = 0; i < 60; i++) {
    if (await box.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(box).toBeFocused();
  await page.keyboard.press("Space");
  await expect(box).toHaveAttribute("aria-checked", "true");
  const bell = page.getByRole("button", { name: /^알림 \d+개$/ });
  for (let i = 0; i < 60; i++) {
    if (await bell.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Shift+Tab");
  }
  await expect(bell).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(bell).toBeFocused();
});

test("5개 조합 스크린샷 (/_styleguide)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "스크린샷 기준은 데스크톱 한 벌");
  const combos = [
    { theme: "light", species: "dog", reduced: false },
    { theme: "light", species: "cat", reduced: false },
    { theme: "dark", species: "dog", reduced: false },
    { theme: "dark", species: "cat", reduced: false },
    { theme: "light", species: "dog", reduced: true },
  ] as const;
  await page.goto("/_styleguide");
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  for (const c of combos) {
    await page.evaluate(({ theme, species, reduced }) => {
      const r = document.documentElement;
      r.dataset.theme = theme;
      r.dataset.species = species;
      r.dataset.motion = reduced ? "reduced" : "full";
    }, c);
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot(`styleguide-${c.theme}-${c.species}${c.reduced ? "-reduced" : ""}.png`, {
      fullPage: true,
      animations: "disabled",
    });
  }
});
