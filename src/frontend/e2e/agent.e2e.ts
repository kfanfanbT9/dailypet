// 실제 Agent(Bedrock 호출) E2E: S06·S10. Agent(:8000)가 꺼져 있으면 건너뛴다. 데스크톱 한 번만 (호출 비용).
import { expect, test } from "@playwright/test";
import { login, seedReset } from "./helpers";

test.beforeEach(async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "실제 Agent 호출은 한 벌만");
  const h = await request.get("http://localhost:3000/health").catch(() => null);
  test.skip(!h || (await h.json()).agent !== "ok", "Agent 서버가 꺼져 있다");
  seedReset();
});

test("S06: 보리 간식 질문 → 답변·답한 도우미·근거 보기", async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, "jiwoo", "/chat?pet=pet_bori");
  await page.getByLabel("질문", { exact: true }).fill("보리 간식으로 뭐가 좋아?");
  await page.getByRole("button", { name: "보내기" }).click();
  await expect(page.getByText(/식단 도우미가 답했어요/)).toBeVisible({ timeout: 150_000 });
  await page.getByRole("button", { name: /근거 보기/ }).last().click();
  await expect(page.getByRole("region", { name: "처리 과정" }).last()).toContainText("식단 도우미에게 전달");
  await expect(page).toHaveURL(/\/chat\/thr_/);
});

test("S10: 나비 광견병 등록 요청 → 승인 → W07에 새 일정", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page, "jiwoo", "/chat?pet=pet_nabi");
  await page.getByLabel("질문", { exact: true }).fill("나비 광견병 예방접종을 2026-12-01로 등록해줘");
  await page.getByRole("button", { name: "보내기" }).click();
  const card = page.getByRole("region", { name: "승인 요청" });
  await expect(card).toBeVisible({ timeout: 150_000 });
  await card.getByRole("button", { name: "승인" }).click();
  await expect(card.getByText(/등록했어요|변경했어요/)).toBeVisible({ timeout: 150_000 });
  await page.goto("/health?pet=pet_nabi");
  await expect(page.getByText(/광견병/).first()).toBeVisible();
  await expect(page.getByText(/12\/1/).first()).toBeVisible();
});
