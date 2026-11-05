import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { db } from "@/mocks/db";
import { recordRequests, renderApp } from "@/test/render";

const section = (name: string) => screen.getByRole("region", { name });

describe("W11 내 취향", () => {
  it("S04 7단계: 모카 좋아요·싫어요(11/14까지)·공통 조건", async () => {
    db.prefs.push({
      id: "pref_pet_mocha_350835c502",
      user_id: "usr_a80678fb2f7a",
      pet_id: "pet_mocha",
      kind: "like",
      target: "act_cat_kibble_chase_01",
      note: "",
      score: 3,
      excluded_until: null,
      updated_at: "2026-11-09T10:00:00+09:00",
    });
    renderApp("/preferences?pet=pet_mocha", { as: "seojun", today: "2026-11-10" });
    await screen.findByRole("heading", { name: "모카의 취향" });
    expect(await within(await screen.findByRole("region", { name: "좋아해요" })).findByText(/사료 던져 쫓기/)).toBeInTheDocument();
    expect(within(section("싫어해요")).getByText(/낚싯대/)).toBeInTheDocument();
    expect(within(section("싫어해요")).getByText("11/14 (토)까지 추천하지 않아요")).toBeInTheDocument();
    const c = section("지켜야 할 조건");
    expect(within(c).getByText("놀이·산책은 19:00 이후")).toBeInTheDocument();
    expect(within(c).getByText("모든 아이 공통")).toBeInTheDocument();
  });

  it("공통 조건 ✕ → 확인 모달이 먼저 / 일반 항목 ✕ → 바로 삭제 + 토스트", async () => {
    const rec = recordRequests();
    const { user } = renderApp("/preferences?pet=pet_mocha", { as: "seojun" });
    await screen.findByRole("heading", { name: "모카의 취향" });
    await user.click(await screen.findByRole("button", { name: "놀이·산책은 19:00 이후 지우기" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("모든 반려동물에서 지워져요");
    expect(rec.count("DELETE", /preferences\/pref_seojun_time_constraint/)).toBe(0);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "지우기" }));
    await waitFor(() => expect(rec.count("DELETE", /preferences\/pref_seojun_time_constraint/)).toBe(1));
    await user.click(screen.getByRole("button", { name: /낚싯대.*지우기/ }));
    await waitFor(() => expect(rec.count("DELETE", /preferences\/pref_mocha_dislike_wand/)).toBe(1));
    expect(await screen.findByText("다음 추천부터 다시 후보에 들어가요")).toBeInTheDocument();
    rec.stop();
  });

  it("S21: 보리 전체 초기화 → 확인 → 빈 상태, 요청 1회 / 자주 한 활동(D4) 표시", async () => {
    const rec = recordRequests();
    const { user } = renderApp("/preferences?pet=pet_bori");
    await screen.findByRole("heading", { name: "보리의 취향" });
    expect(await within(await screen.findByRole("region", { name: "자주 한 활동" })).findByText("3회")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /보리의 취향 전체 초기화/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("보리의 취향과 활동 기록 점수가 초기화돼요");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "초기화" }));
    expect(await screen.findByText(/아직 기억한 취향이 없어요/)).toBeInTheDocument();
    expect(rec.count("DELETE", "/api/pets/pet_bori/preferences")).toBe(1);
    rec.stop();
  });
});

describe("W08 체중 기록 (S05, 보리)", () => {
  it("33.2kg 기록 → 점 3개(35 → 34 → 33.2), 마스코트 변화 문구", async () => {
    const { user } = renderApp("/weights?pet=pet_bori");
    await screen.findByRole("heading", { name: "보리 체중 기록" });
    await waitFor(() => expect(screen.getAllByTestId("weight-point")).toHaveLength(2));
    const date = screen.getByLabelText(/날짜/);
    await user.clear(date);
    await user.type(date, "2026-11-03");
    await user.type(screen.getByRole("spinbutton"), "33.2");
    await user.click(screen.getByRole("button", { name: "기록하기" }));
    await waitFor(() => expect(screen.getAllByTestId("weight-point")).toHaveLength(3));
    const values = screen.getAllByTestId("weight-point").map((g) => g.querySelector("text")!.textContent);
    expect(values).toEqual(["35", "34", "33.2"]);
    expect(screen.getByText("첫 기록보다 1.8kg 줄었어요")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("dp.outdated") ?? "[]")).toContain("pet_bori");
  });

  it("개 150kg → 범위 안내, 요청 0회", async () => {
    const rec = recordRequests();
    const { user } = renderApp("/weights?pet=pet_bori");
    await screen.findByRole("heading", { name: "보리 체중 기록" });
    await user.type(screen.getByRole("spinbutton"), "150");
    await user.click(screen.getByRole("button", { name: "기록하기" }));
    expect(screen.getByText("체중은 0.5~100kg 사이로 입력해 주세요")).toBeInTheDocument();
    expect(rec.count("POST", /weights/)).toBe(0);
    rec.stop();
  });

  it("같은 날짜 → 덮어쓰기 확인 → overwrite", async () => {
    const { user } = renderApp("/weights?pet=pet_bori");
    await screen.findByRole("heading", { name: "보리 체중 기록" });
    const date = screen.getByLabelText(/날짜/);
    await user.clear(date);
    await user.type(date, "2026-11-01");
    await user.type(screen.getByRole("spinbutton"), "33.9");
    await user.click(screen.getByRole("button", { name: "기록하기" }));
    const dlg = await screen.findByRole("dialog");
    expect(dlg).toHaveTextContent("이 날짜에 기록이 있어요. 덮어쓸까요?");
    await user.click(within(dlg).getByRole("button", { name: "덮어쓰기" }));
    await waitFor(() =>
      expect(db.weights.find((w) => w.pet_id === "pet_bori" && w.date === "2026-11-01")?.weight_kg).toBe(33.9),
    );
    expect(db.weights.filter((w) => w.pet_id === "pet_bori" && w.date === "2026-11-01")).toHaveLength(1);
  });

  it("최신 기록 삭제 → 체중 카드가 이전 값", async () => {
    const { user } = renderApp("/weights?pet=pet_bori");
    await screen.findByRole("heading", { name: "보리 체중 기록" });
    await user.click(await screen.findByRole("button", { name: "11/1 (일) 기록 삭제" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.getAllByTestId("weight-point")).toHaveLength(1));
    await user.click(screen.getAllByRole("link", { name: /오늘/ })[0]);
    expect(await screen.findByText("35kg")).toBeInTheDocument();
  });
});

describe("W10 대화 기록 (S16)", () => {
  it("보리 목록에 나비 대화가 없고, 항목 → 같은 threadId로 W09, 삭제 → 사라짐", async () => {
    const mk = (pet: string, tid: string, q: string) => ({
      id: `log_${tid}`,
      user_id: "usr_69d308a849e0",
      pet_id: pet,
      thread_id: tid,
      question: q,
      answer: "답변",
      trace: [{ step: 1, type: "final", agent: "supervisor" }],
      created_at: "2026-11-09T10:00:00+09:00",
    });
    db.chat.push(
      mk("pet_bori", "thr_usr_69d308a849e0_pet_bori_0000000a", "보리 산책 질문"),
      mk("pet_nabi", "thr_usr_69d308a849e0_pet_nabi_0000000b", "나비 놀이 질문"),
    );
    const { user } = renderApp("/chat/history?pet=pet_bori");
    const list = await screen.findByRole("list", { name: "대화 목록" });
    expect(within(list).getByText("보리 산책 질문")).toBeInTheDocument();
    expect(within(list).queryByText("나비 놀이 질문")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: '"보리 산책 질문" 대화 삭제' }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "삭제" }));
    expect(await screen.findByText("아직 나눈 대화가 없어요")).toBeInTheDocument();
    expect(db.chat.some((c) => c.thread_id === "thr_usr_69d308a849e0_pet_bori_0000000a")).toBe(false);
  });

  it("항목을 누르면 /chat/:threadId로 지난 대화가 열린다", async () => {
    db.chat.push({
      id: "log_x",
      user_id: "usr_69d308a849e0",
      pet_id: "pet_bori",
      thread_id: "thr_usr_69d308a849e0_pet_bori_0000000c",
      question: "보리 목욕 주기",
      answer: "한 달에 한 번이면 충분해요.",
      trace: [{ step: 1, type: "final", agent: "supervisor" }],
      created_at: "2026-11-09T10:00:00+09:00",
    });
    const { user } = renderApp("/chat/history?pet=pet_bori");
    const list = await screen.findByRole("list", { name: "대화 목록" });
    await user.click(within(list).getByRole("link", { name: /보리 목욕 주기/ }));
    expect(await screen.findByText("한 달에 한 번이면 충분해요.")).toBeInTheDocument();
  });
});

describe("W12 내 정보", () => {
  it("회원 탈퇴: 이메일이 다르면 비활성, 같으면 탈퇴 → 로그인 화면 인사", async () => {
    const { user } = renderApp("/me");
    await user.click(await screen.findByRole("button", { name: "회원 탈퇴" }));
    const dlg = screen.getByRole("dialog");
    const ok = within(dlg).getByRole("button", { name: "탈퇴하기" });
    const email = db.users.find((u) => u.id === "usr_69d308a849e0")!.email as string;
    await user.type(within(dlg).getByLabelText("가입한 이메일을 입력해 주세요"), "wrong@example.com");
    expect(ok).toBeDisabled();
    await user.clear(within(dlg).getByLabelText("가입한 이메일을 입력해 주세요"));
    await user.type(within(dlg).getByLabelText("가입한 이메일을 입력해 주세요"), email);
    expect(ok).toBeEnabled();
    await user.click(ok);
    expect(await screen.findByText("그동안 함께해 줘서 고마워요")).toBeInTheDocument();
  });

  it("테마 밤하늘 → <html data-theme=dark>, 저장됨", async () => {
    const { user } = renderApp("/me");
    await user.click(await screen.findByRole("radio", { name: "밤하늘" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("dp.theme")).toBe("dark");
  });

  it("localStorage가 예외를 던져도 화면이 뜬다", async () => {
    const orig = Storage.prototype.getItem;
    const origSet = Storage.prototype.setItem;
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
    try {
      const { user } = renderApp("/me");
      await user.click(await screen.findByRole("radio", { name: "밤하늘" }));
      expect(document.documentElement.dataset.theme).toBe("dark");
    } finally {
      Storage.prototype.getItem = orig;
      Storage.prototype.setItem = origSet;
    }
  });

  it("로그아웃 → 로그인 화면", async () => {
    const { user } = renderApp("/me");
    await user.click(await screen.findByRole("button", { name: "로그아웃" }));
    expect(await screen.findByRole("button", { name: "로그인" })).toBeInTheDocument();
    expect(db.session).toBeNull();
  });
});
