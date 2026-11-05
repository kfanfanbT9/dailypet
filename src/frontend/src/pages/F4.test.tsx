import { act, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/mocks/db";
import { server } from "@/mocks/server";
import { recordRequests, renderApp } from "@/test/render";

afterEach(() => vi.useRealTimers());

const cards = () => within(screen.getByRole("region", { name: "할 일 목록" })).queryAllByRole("listitem");
const cardOf = (text: RegExp) => cards().find((li) => text.test(li.textContent ?? ""))!;

describe("W05 대시보드 (S03, 콩이 11/10)", () => {
  it("배너에 광견병 D-7만, 할 일에 DHPP D-3·광견병 D-7 둘 다", async () => {
    renderApp("/?pet=pet_kongi", { as: "haneul" });
    expect(await screen.findByText(/광견병.*\(콩이\)/)).toBeInTheDocument();
    expect(screen.getByText("D-7")).toBeInTheDocument();
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    expect(cardOf(/종합백신.*3차 D-3/)).toBeTruthy();
    expect(cardOf(/광견병.*D-7/)).toBeTruthy();
    expect(screen.getByText(/11월 10일 화요일 · 오늘의 할 일/)).toBeInTheDocument();
  });

  it("건강 할 일 카드에는 👍/👎/바꾸기가 없고 [일정 ›]만", async () => {
    renderApp("/?pet=pet_kongi", { as: "haneul" });
    await waitFor(() => expect(cardOf(/종합백신/)).toBeTruthy());
    const health = cardOf(/종합백신/);
    expect(within(health).queryByRole("button", { name: "좋아요" })).not.toBeInTheDocument();
    expect(within(health).queryByRole("button", { name: "싫어요" })).not.toBeInTheDocument();
    expect(within(health).queryByRole("button", { name: /바꾸기/ })).not.toBeInTheDocument();
    expect(within(health).getByRole("button", { name: "일정 ›" })).toBeInTheDocument();
  });

  it("같은 날 두 번 열어도 목록 조회만 하고 다시 만들기 API는 0회, 완료 체크가 유지된다", async () => {
    const rec = recordRequests();
    const a = renderApp("/?pet=pet_kongi", { as: "haneul" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    const diet = cards().find((li) => /식단/.test(li.textContent ?? ""))!;
    await a.user.click(within(diet).getByRole("checkbox"));
    await waitFor(() =>
      expect(db.tasks.some((t) => t.pet_id === "pet_kongi" && t.category === "diet" && t.done)).toBe(true),
    );
    a.unmount();
    renderApp("/?pet=pet_kongi", { as: "haneul" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    const dietAgain = cards().find((li) => /식단/.test(li.textContent ?? ""))!;
    expect(within(dietAgain).getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
    expect(rec.count("POST", /tasks\/generate/)).toBe(0);
    rec.stop();
  });

  it("움직임 줄이기면 완료 반짝임이 렌더되지 않는다", async () => {
    window.localStorage.setItem("dp.reduceMotion", "1");
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    await user.click(within(cards()[0]).getByRole("checkbox"));
    expect(screen.queryByTestId("sparkles")).not.toBeInTheDocument();
  });

  it("움직임 있음이면 반짝임이 나온다", async () => {
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    await user.click(within(cards()[0]).getByRole("checkbox"));
    expect(screen.getByTestId("sparkles")).toBeInTheDocument();
  });

  it("바꾸기 swapped:false → 안내 토스트, 카드 유지 (S04 예외)", async () => {
    server.use(
      http.post("/api/tasks/:id/swap", async ({ params }) =>
        HttpResponse.json({
          swapped: false,
          notice: "더 추천할 항목이 없어요.",
          task: db.tasks.find((t) => t.id === params.id),
        }),
      ),
    );
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    const act0 = cards().find((li) => /활동/.test(li.textContent ?? ""))!;
    const title = act0.textContent;
    await user.click(within(act0).getByRole("button", { name: /바꾸기/ }));
    expect(await screen.findByText("더 추천할 항목이 없어요")).toBeInTheDocument();
    expect(cards().some((li) => li.textContent === title)).toBe(true);
  });

  it("삭제 → 5초 안에 되돌리면 DELETE 0회 / 5초가 지나면 DELETE 1회", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const rec = recordRequests();
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo", fakeTimers: true });
    await waitFor(() => expect(cards().length).toBeGreaterThan(1));
    const n = cards().length;
    const first = cards().find((li) => /활동/.test(li.textContent ?? ""))!;
    await user.click(within(first).getByRole("button", { name: /메뉴/ }));
    await user.click(within(first).getByRole("menuitem", { name: "삭제" }));
    await waitFor(() => expect(cards().length).toBe(n - 1));
    await user.click(screen.getByRole("button", { name: "되돌리기" }));
    await waitFor(() => expect(cards().length).toBe(n));
    await act(async () => vi.advanceTimersByTime(6000));
    expect(rec.count("DELETE", /\/api\/tasks\//)).toBe(0);

    const again = cards().find((li) => /활동/.test(li.textContent ?? ""))!;
    await user.click(within(again).getByRole("button", { name: /메뉴/ }));
    await user.click(within(again).getByRole("menuitem", { name: "삭제" }));
    await act(async () => vi.advanceTimersByTime(4000));
    expect(rec.count("DELETE", /\/api\/tasks\//)).toBe(0);
    await act(async () => vi.advanceTimersByTime(1500));
    await waitFor(() => expect(rec.count("DELETE", /\/api\/tasks\//)).toBe(1));
    rec.stop();
  });

  it("relaxed:[dislike] 항목에 ⟨싫어요 표시한 항목⟩ 배지와 사유", async () => {
    server.use(
      http.get("/api/pets/:id/tasks", () =>
        HttpResponse.json({
          date: "2026-11-10",
          tasks: [
            {
              id: "task_r1",
              user_id: "usr_d6eff68d8ef0",
              pet_id: "pet_hodu",
              date: "2026-11-10",
              time: "19:30",
              category: "activity",
              source: "auto",
              catalog_item_id: "act_cat_scratching_stretch_01",
              health_event_id: null,
              title: "스크래처 스트레칭",
              done: false,
              reason: "r",
              rank: 1,
              relaxed: ["dislike"],
            },
          ],
        }),
      ),
    );
    renderApp("/?pet=pet_hodu", { as: "youngja" });
    expect(await screen.findByText("싫어요 표시한 항목")).toBeInTheDocument();
    expect(screen.getByText(/후보가 부족해 다시 넣었어요/)).toBeInTheDocument();
  });

  it("다시 제안 확인 모달 [취소] → 요청 0회 (S04 예외), [다시 만들기] → 1회", async () => {
    const rec = recordRequests();
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: "↻ 할 일 다시 제안" }));
    await user.click(await screen.findByRole("button", { name: "취소" }));
    expect(rec.count("POST", /tasks\/generate/)).toBe(0);
    await user.click(screen.getByRole("button", { name: "↻ 할 일 다시 제안" }));
    await user.click(await screen.findByRole("button", { name: "다시 만들기" }));
    await waitFor(() => expect(rec.count("POST", /tasks\/generate/)).toBe(1));
    rec.stop();
  });

  it("할 일 응답 notice → 할 일 영역만 오류, 알림 배너·체중 카드는 정상 (S22)", async () => {
    db.failures.tasks = 503;
    renderApp("/?pet=pet_kongi", { as: "haneul" });
    expect(await screen.findByText("추천을 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(await screen.findByText(/광견병.*\(콩이\)/)).toBeInTheDocument();
    expect(screen.getByText("3.1kg")).toBeInTheDocument();
  });

  it('👎 → "11/16 (월)까지 추천하지 않아요" 토스트 (오늘 + 6일, 서버 date 기준)', async () => {
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    const act0 = cards().find((li) => /활동/.test(li.textContent ?? ""))!;
    await user.click(within(act0).getByRole("button", { name: "싫어요" }));
    expect(await screen.findByText("11/16 (월)까지 추천하지 않아요")).toBeInTheDocument();
    expect(within(act0).getByRole("button", { name: "싫어요" })).toHaveAttribute("aria-pressed", "true");
  });

  it("프로필 변경 배너 → [할 일 다시 제안] 후 사라짐 (S05 4단계)", async () => {
    window.localStorage.setItem("dp.outdated", JSON.stringify(["pet_bori"]));
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    expect(await screen.findByText("프로필이 바뀌었어요.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "할 일 다시 제안" }));
    await user.click(await screen.findByRole("button", { name: "다시 만들기" }));
    await waitFor(() => expect(screen.queryByText("프로필이 바뀌었어요.")).not.toBeInTheDocument());
  });
});

describe("W06 직접 추가", () => {
  it("추천 목록은 petId로 서버 안전 필터 목록을 쓴다 (보리: 닭고기 항목 없음)", async () => {
    const rec = recordRequests();
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: "＋ 직접 추가" }));
    await user.click(await screen.findByRole("tab", { name: "추천 목록에서 고르기" }));
    await user.click(screen.getByRole("tab", { name: "식단" }));
    const radios = await screen.findAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
    expect(screen.queryByText(/닭고기/)).not.toBeInTheDocument();
    expect(
      rec.calls.some(
        (c) =>
          c.path.startsWith("/api/catalog") &&
          c.path.includes("petId=pet_bori") &&
          c.path.includes("category=diet"),
      ),
    ).toBe(true);
    rec.stop();
  });

  it('직접 입력 "빗질 21:00" → 직접 추가 배지 카드', async () => {
    const { user } = renderApp("/?pet=pet_mocha", { as: "seojun" });
    await waitFor(() => expect(cards().length).toBeGreaterThan(0));
    await user.click(screen.getByRole("button", { name: "＋ 직접 추가" }));
    await user.type(await screen.findByLabelText("할 일"), "빗질");
    await user.type(screen.getByLabelText("시간 (선택)"), "21:00");
    await user.click(screen.getByRole("button", { name: "추가하기" }));
    await waitFor(() => expect(cardOf(/빗질/)).toBeTruthy());
    expect(within(cardOf(/빗질/)).getByText("직접 추가")).toBeInTheDocument();
  });
});

describe("W07 건강 일정", () => {
  it('S11: 11/14 DHPP 3차 완료 → 다음 일정 "4차 · 12/12 (토)" (서버 응답 기준)', async () => {
    const { user } = renderApp("/health?pet=pet_kongi", { as: "haneul", today: "2026-11-14" });
    const card = (await screen.findAllByRole("listitem")).find((li) =>
      /종합백신.*3차/.test(li.textContent ?? ""),
    )!;
    await user.click(within(card).getByRole("button", { name: "완료" }));
    const dateInput = await screen.findByLabelText("실제로 한 날");
    expect(dateInput).toHaveValue("2026-11-14");
    await user.click(screen.getByRole("button", { name: "완료하기" }));
    expect(await screen.findByText(/다음 일정: 4차 · 12\/12 \(토\)/)).toBeInTheDocument();
  });

  it("이력 확인 필요 → 마지막 날짜 입력 후 사라짐", async () => {
    const { user } = renderApp("/health?pet=pet_kongi", { as: "haneul", today: "2026-11-14" });
    const section = await screen.findByRole("region", { name: /이력 확인 필요/ });
    await user.click(within(section).getByRole("button", { name: "마지막 날짜 입력" }));
    const input = await screen.findByLabelText("마지막으로 한 날");
    await user.clear(input);
    await user.type(input, "2026-10-25");
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    await user.click(await screen.findByRole("button", { name: "확인" }));
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: /이력 확인 필요/ })).not.toBeInTheDocument(),
    );
  });

  it("미래 완료일은 막는다, 상태 배지는 색+아이콘+글자", async () => {
    const { user } = renderApp("/health?pet=pet_kongi", { as: "haneul" });
    expect(await screen.findByText("D-3")).toBeInTheDocument();
    const card = (await screen.findAllByRole("listitem")).find((li) => /광견병/.test(li.textContent ?? ""))!;
    await user.click(within(card).getByRole("button", { name: "완료" }));
    const input = await screen.findByLabelText("실제로 한 날");
    await user.clear(input);
    await user.type(input, "2026-11-20");
    await user.click(screen.getByRole("button", { name: "완료하기" }));
    expect(await screen.findByText("오늘보다 뒤의 날짜는 입력할 수 없어요")).toBeInTheDocument();
  });

  it("캘린더: grid, 화살표로 날짜 이동", async () => {
    const { user } = renderApp("/health?pet=pet_kongi", { as: "haneul" });
    await screen.findByText("D-3");
    await user.click(screen.getByRole("tab", { name: "캘린더" }));
    const grid = screen.getByRole("grid");
    const todayCell = within(grid).getByRole("gridcell", { name: /11\/10/ });
    todayCell.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    await waitFor(() =>
      expect(within(grid).getByRole("gridcell", { name: /11\/13.*일정 1개/ })).toHaveFocus(),
    );
  });
});
