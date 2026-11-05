import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/mocks/db";
import { recordRequests, renderApp } from "@/test/render";

afterEach(() => vi.useRealTimers());

describe("F-2 가입 (W02)", () => {
  it("409 → 이메일 칸 아래 안내, 다른 칸 값은 유지", async () => {
    const { user } = renderApp("/signup", { as: null });
    await user.type(screen.getByLabelText(/이메일/), "HANEUL@demo.dailypet");
    await user.type(screen.getByLabelText(/비밀번호/), "abcdefgh");
    await user.type(screen.getByLabelText(/닉네임/), "하늘이");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByText("이미 사용 중인 이메일이에요")).toBeInTheDocument();
    expect(screen.getByLabelText(/닉네임/)).toHaveValue("하늘이");
    expect(screen.getByLabelText(/이메일/)).toHaveValue("HANEUL@demo.dailypet");
    expect(screen.getByLabelText(/이메일/)).toHaveFocus();
  });

  it("가입 성공 → 반려동물 등록 화면", async () => {
    const { user } = renderApp("/signup", { as: null });
    await user.type(screen.getByLabelText(/이메일/), "NewBie@Demo.DailyPet");
    await user.type(screen.getByLabelText(/비밀번호/), "Spring!2026");
    await user.type(screen.getByLabelText(/닉네임/), "새봄");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByRole("heading", { name: "반려동물 등록하기" })).toBeInTheDocument();
    expect(db.users.some((u) => u.email === "newbie@demo.dailypet")).toBe(true);
  });
});

describe("F-3 반려동물 등록 (W03)", () => {
  async function openNew() {
    vi.setSystemTime(new Date("2026-11-10T09:00:00+09:00"));
    const r = renderApp("/pets/new", { as: "haneul" });
    await screen.findByRole("heading", { name: "반려동물 등록하기" });
    return r;
  }

  it("종 선택지는 정확히 2개", async () => {
    await openNew();
    const group = screen.getByRole("group", { name: /종/ });
    expect(within(group).getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByText(/다른 동물은 지원 예정이에요/)).toBeInTheDocument();
  });

  const MESSAGES = {
    이름: "이름을 입력해 주세요",
    종: "강아지 또는 고양이를 골라 주세요",
    생년월일: "생년월일을 입력해 주세요",
    체중: "체중을 입력해 주세요",
  } as const;

  it.each(Object.keys(MESSAGES))("필수값 %s만 비우면 그 칸에 안내, 요청 0회", async (empty) => {
    const { user } = await openNew();
    const rec = recordRequests();
    if (empty !== "이름") await user.type(screen.getByLabelText(/^이름/), "두부");
    if (empty !== "종") await user.click(screen.getByRole("radio", { name: /강아지/ }));
    if (empty !== "생년월일") await user.type(screen.getByLabelText(/^생년월일/), "2026-08-01");
    if (empty !== "체중") await user.type(screen.getByLabelText(/^체중/), "2");
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    expect(await screen.findByText(MESSAGES[empty as keyof typeof MESSAGES])).toBeInTheDocument();
    expect(rec.count("POST", "/api/pets")).toBe(0);
    rec.stop();
  });

  it("생년월일 2026-08-01 (기준 11/10) → 어린 동물 (3개월), 체중 범위 안내가 종에 따라 바뀜", async () => {
    const { user } = await openNew();
    await user.click(screen.getByRole("radio", { name: /강아지/ }));
    await user.type(screen.getByLabelText(/^생년월일/), "2026-08-01");
    expect(screen.getByText("→ 어린 동물 (3개월)")).toBeInTheDocument();
    expect(screen.getByText(/0.5~100kg/)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /고양이/ }));
    expect(screen.getByText(/0.3~15kg/)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "크기" })).not.toBeInTheDocument();
  });

  it("두부 등록 → 대시보드로, 탭에 두부, 알레르기 태그 저장", async () => {
    const { user } = await openNew();
    await user.type(screen.getByLabelText(/^이름/), "두부");
    await user.click(screen.getByRole("radio", { name: /강아지/ }));
    await user.type(screen.getByLabelText(/^생년월일/), "2026-08-01");
    await user.type(screen.getByLabelText(/^체중/), "2");
    await user.click(screen.getByRole("button", { name: /닭고기/ }));
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    await waitFor(() => expect(db.pets.some((p) => p.name === "두부")).toBe(true));
    expect(db.pets.find((p) => p.name === "두부")!.allergies).toEqual(["chicken"]);
    expect((await screen.findAllByRole("tab", { name: /두부/ })).length).toBeGreaterThan(0);
  });
});

describe("F-3 수정·삭제·전환", () => {
  it("수정 화면은 종을 바꿀 수 없고, 저장하면 프로필 변경 표시를 남긴다 (tasks_outdated)", async () => {
    const { user } = renderApp("/pets/pet_bori/edit?pet=pet_bori", { as: "jiwoo" });
    await screen.findByRole("heading", { name: "보리 정보 수정" });
    expect(screen.queryByRole("radio", { name: /고양이/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "낮음" }));
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem("dp.outdated") ?? "[]")).toContain("pet_bori"),
    );
    expect(db.pets.find((p) => p.id === "pet_bori")!.activity_level).toBe("low");
  });

  it("삭제 모달: 이름이 다르면 비활성, 같으면 confirm_name과 함께 삭제 (S20)", async () => {
    const { user } = renderApp("/pets?pet=pet_coco", { as: "leaver" });
    await user.click(await screen.findByRole("button", { name: "코코 삭제" }));
    const confirm = await screen.findByRole("button", { name: "삭제하기" });
    await user.type(screen.getByLabelText(/이름을 입력/), "코코아");
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    await user.clear(screen.getByLabelText(/이름을 입력/));
    await user.type(screen.getByLabelText(/이름을 입력/), "코코");
    await user.click(confirm);
    await waitFor(() => expect(db.pets.some((p) => p.id === "pet_coco")).toBe(false));
    expect(await screen.findByRole("button", { name: "등록하기" })).toBeInTheDocument();
  });

  it("삭제 실패(500) → 안내, 목록 유지", async () => {
    db.failures.deletePet = 500;
    const { user } = renderApp("/pets?pet=pet_coco", { as: "leaver" });
    await user.click(await screen.findByRole("button", { name: "코코 삭제" }));
    await user.type(await screen.findByLabelText(/이름을 입력/), "코코");
    await user.click(screen.getByRole("button", { name: "삭제하기" }));
    expect(await screen.findByText("삭제하지 못했어요. 잠시 후 다시 시도해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "코코 삭제" })).toBeInTheDocument();
  });

  it("S02: 보리 → 나비 전환, 다시 열어도 나비 유지 (마지막 선택 기억)", async () => {
    const a = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    const nabi = (await screen.findAllByRole("tab", { name: /나비/ }))[0];
    await a.user.click(nabi);
    await waitFor(() =>
      expect(screen.getAllByRole("tab", { name: /나비/ })[0]).toHaveAttribute("aria-selected", "true"),
    );
    expect(document.documentElement.dataset.species).toBe("cat");
    a.unmount();
    renderApp("/", { as: "jiwoo" });
    await waitFor(() =>
      expect(screen.getAllByRole("tab", { name: /나비/ })[0]).toHaveAttribute("aria-selected", "true"),
    );
  });

  it("목록에 없는 ?pet=pet_mocha(다른 사용자) → 첫 반려동물, pet_mocha로 요청하지 않음", async () => {
    const rec = recordRequests();
    renderApp("/?pet=pet_mocha", { as: "jiwoo" });
    await waitFor(() =>
      expect(screen.getAllByRole("tab", { name: /보리/ })[0]).toHaveAttribute("aria-selected", "true"),
    );
    expect(rec.calls.some((c) => c.path.includes("pet_mocha"))).toBe(false);
    rec.stop();
  });

  it("반려동물 탭은 좌우 화살표로 이동", async () => {
    const { user } = renderApp("/?pet=pet_bori", { as: "jiwoo" });
    const bori = (await screen.findAllByRole("tab", { name: /보리/ }))[0];
    bori.focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(screen.getAllByRole("tab", { name: /나비/ })[0]).toHaveAttribute("aria-selected", "true"),
    );
  });
});
