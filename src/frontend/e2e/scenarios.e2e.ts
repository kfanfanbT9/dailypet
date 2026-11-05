// 시나리오 E2E (USER_SCENARIO.md): S01, S04 일부, S20 — 실제 Backend + seed:reset.
import { expect, test } from "@playwright/test";
import { DEMO_PASSWORD, login, passwordInput, seedReset } from "./helpers";

test.beforeEach(() => seedReset());

test("S01 1·2·5단계: 가입 → W03, 로그아웃 → /api/pets 401 → 다시 로그인", async ({ page }, info) => {
  const email = `NewBie+${info.project.name}@Demo.DailyPet`;
  await page.goto("/signup");
  await page.getByLabel("이메일").fill(email);
  await passwordInput(page).fill(DEMO_PASSWORD);
  await page.getByLabel("닉네임").fill("새내기");
  const consent = page.getByRole("checkbox");
  if (await consent.count()) await consent.first().check();
  await page.getByRole("button", { name: /가입/ }).click();
  await page.waitForURL(/\/pets\/new/);

  await page.goto("/me");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await page.waitForURL(/\/login/);
  const res = await page.request.get("/api/pets");
  expect(res.status()).toBe(401);

  await page.getByLabel("이메일").fill(email.toLowerCase());
  await passwordInput(page).fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/pets\/new/);
});

test("S01 3단계: 두부 등록 → W05, 건강 일정에 '이력 확인 필요'", async ({ page }, info) => {
  const email = `dubu+${info.project.name}@demo.dailypet`;
  await page.goto("/signup");
  await page.getByLabel("이메일").fill(email);
  await passwordInput(page).fill(DEMO_PASSWORD);
  await page.getByLabel("닉네임").fill("두부보호자");
  const consent = page.getByRole("checkbox");
  if (await consent.count()) await consent.first().check();
  await page.getByRole("button", { name: /가입/ }).click();
  await page.waitForURL(/\/pets\/new/);
  await page.getByLabel(/이름/).fill("두부");
  await page.getByRole("radio", { name: /강아지/ }).check();
  await page.getByLabel(/생년월일/).fill("2026-06-01");
  await page.getByLabel(/체중/).fill("4.2");
  const size = page.getByLabel(/크기/);
  if (await size.count()) await size.selectOption({ index: 1 });
  await page.getByRole("button", { name: /저장|등록/ }).last().click();
  await page.waitForURL((u) => u.pathname === "/");
  await expect(page.getByText(/오늘의 할 일/).first()).toBeVisible({ timeout: 30_000 });
  await page.goto(page.url().replace(/\/(\?|$)/, "/health$1"));
  await expect(page.getByText("이력 확인 필요").first()).toBeVisible();
});

test("S04 일부 (모카): 낚싯대 놀이 없음, 활동 시간은 19:00 이후", async ({ page }) => {
  await login(page, "seojun", "/?pet=pet_mocha");
  const list = page.getByRole("region", { name: "할 일 목록" });
  await expect(list.getByRole("listitem").first()).toBeVisible({ timeout: 30_000 });
  await expect(list).not.toContainText("낚싯대");
  const activities = list.getByRole("listitem").filter({ hasText: "활동" });
  for (const li of await activities.all()) {
    const time = (await li.textContent())?.match(/\b(\d{2}):(\d{2})\b/);
    if (time) expect(Number(time[1])).toBeGreaterThanOrEqual(19);
  }
});

test("S20 2·3단계: 탈퇴 → W01 → 같은 이메일로 다시 가입 → 반려동물 0마리 안내", async ({ page }) => {
  await login(page, "youngja", "/me");
  await page.getByRole("button", { name: "회원 탈퇴" }).click();
  await page.getByLabel("가입한 이메일을 입력해 주세요").fill("youngja@demo.dailypet");
  await page.getByRole("button", { name: "탈퇴하기" }).click();
  await expect(page.getByText("그동안 함께해 줘서 고마워요")).toBeVisible();
  await page.goto("/signup");
  await page.getByLabel("이메일").fill("youngja@demo.dailypet");
  await passwordInput(page).fill(DEMO_PASSWORD);
  await page.getByLabel("닉네임").fill("영자");
  const consent = page.getByRole("checkbox");
  if (await consent.count()) await consent.first().check();
  await page.getByRole("button", { name: /가입/ }).click();
  await page.waitForURL(/\/pets\/new/);
  const res = await page.request.get("/api/pets");
  expect(await res.json()).toEqual([]);
});
