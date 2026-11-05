import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { ApiError, request, setUnauthorizedHandler } from "@/api/client";
import { Mascot } from "@/components/mascot/Mascot";
import { server } from "@/mocks/server";
import { SettingsProvider } from "@/state/settings";
import { Badge, HealthBadge } from "./Badge";
import { Button } from "./Button";
import { Input } from "./Field";
import { ConfirmModal, Modal } from "./Modal";
import { EmptyState, ErrorState, ProgressBar, Tabs } from "./States";
import { ToastProvider, useToast } from "./Toast";
// @ts-expect-error — JS 스크립트 모듈
import { lintText } from "../../../scripts/lint-tokens.mjs";

const wrap = (ui: React.ReactNode) =>
  render(
    <SettingsProvider>
      <ToastProvider>{ui}</ToastProvider>
    </SettingsProvider>,
  );

describe("기본 컴포넌트 접근성 (axe 위반 0건)", () => {
  it("버튼·입력·배지·빈 상태·오류·진행 막대·탭·마스코트", async () => {
    const { container } = wrap(
      <main>
        <Button>저장하기</Button>
        <Button variant="danger" disabled>
          삭제
        </Button>
        <Button aria-label="좋아요" variant="ghost">
          👍
        </Button>
        <Input label="체중" unit="kg" error="범위를 확인해 주세요" />
        <Badge tone="danger" icon="⚠️">
          지연됨
        </Badge>
        <HealthBadge status="scheduled" dDay={3} />
        <EmptyState title="아직 할 일이 없어요" action={{ label: "만들기", onClick: () => {} }} />
        <ErrorState onRetry={() => {}} />
        <ProgressBar done={2} total={6} label="오늘의 할 일 진행률" />
        <Tabs
          label="영역"
          value="diet"
          onChange={() => {}}
          tabs={[
            { value: "diet", label: "식단" },
            { value: "activity", label: "활동" },
          ]}
        />
        <Mascot species="cat" mood="celebrate" size={96} />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("입력 오류는 aria-describedby로 연결되고 aria-invalid", () => {
    wrap(<Input label="체중" error="범위를 확인해 주세요" />);
    const input = screen.getByLabelText("체중");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(input.getAttribute("aria-describedby")!.split(" ")[0])).toHaveTextContent(
      "범위를 확인해 주세요",
    );
  });

  it("로딩 버튼은 다시 누를 수 없다", async () => {
    const onClick = vi.fn();
    wrap(
      <Button loading onClick={onClick}>
        저장하기
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("탭은 좌우 화살표로 이동", async () => {
    function T() {
      const [v, setV] = useState<"a" | "b">("a");
      return (
        <Tabs
          label="t"
          value={v}
          onChange={setV}
          tabs={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ]}
        />
      );
    }
    wrap(<T />);
    screen.getByRole("tab", { name: "A" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "B" })).toHaveFocus();
  });
});

describe("Modal", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>열기</button>
        <Modal open={open} title="확인" onClose={() => setOpen(false)} footer={<button>확인</button>}>
          <input aria-label="안쪽 입력" />
        </Modal>
      </>
    );
  }
  it("열면 포커스가 안으로, Esc로 닫으면 연 버튼으로 복귀", async () => {
    wrap(<Harness />);
    const opener = screen.getByRole("button", { name: "열기" });
    await userEvent.click(opener);
    await waitFor(() => expect(screen.getByLabelText("안쪽 입력")).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
  it("Tab은 모달 안에서만 돈다", async () => {
    wrap(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "열기" }));
    await waitFor(() => expect(screen.getByLabelText("안쪽 입력")).toHaveFocus());
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "확인" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText("안쪽 입력")).toHaveFocus();
  });
});

describe("ConfirmModal (이름 입력 변형)", () => {
  it("입력이 정확히 같을 때만 확인 버튼 활성", async () => {
    const onConfirm = vi.fn();
    wrap(
      <ConfirmModal
        open
        title="정말 보내시겠어요?"
        onClose={() => {}}
        onConfirm={onConfirm}
        confirmLabel="삭제하기"
        danger
        typeToConfirm={{ label: "이름을 입력해 주세요", value: "코코" }}
      />,
    );
    const btn = await screen.findByRole("button", { name: "삭제하기" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    await userEvent.type(screen.getByLabelText("이름을 입력해 주세요"), "코");
    await userEvent.click(btn);
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("이름을 입력해 주세요"), "코");
    expect(btn).not.toHaveAttribute("aria-disabled");
    await userEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("움직임 줄이기", () => {
  it("data-motion=reduced면 Toast·Modal이 위치 이동 없이 페이드만", async () => {
    document.documentElement.dataset.motion = "reduced";
    try {
      window.localStorage.setItem("dp.reduceMotion", "1");
    } catch {
      /* 무시 */
    }
    function Show() {
      const toast = useToast();
      return <button onClick={() => toast("기억해 둘게요")}>토스트</button>;
    }
    wrap(
      <>
        <Show />
        <Modal open title="m" onClose={() => {}}>
          본문
        </Modal>
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "토스트" }));
    const status = await screen.findByRole("status");
    const dialog = screen.getByRole("dialog");
    // framer-motion은 y/scale 이동이 있으면 transform을 쓴다 — 페이드만이면 transform이 없다
    expect(status.style.transform === "" || status.style.transform === "none").toBe(true);
    expect(dialog.style.transform === "" || dialog.style.transform === "none").toBe(true);
  });
});

describe("api/client", () => {
  it("401이면 로그인 이동 콜백, 503이면 ApiError(503)", async () => {
    const onUnauth = vi.fn();
    setUnauthorizedHandler(onUnauth);
    server.use(
      http.get("/api/x401", () =>
        HttpResponse.json({ error: { code: "unauthorized", message: "" } }, { status: 401 }),
      ),
      http.get("/api/x503", () =>
        HttpResponse.json({ error: { code: "agent_unavailable", message: "" } }, { status: 503 }),
      ),
    );
    await expect(request("/api/x401")).rejects.toMatchObject({ status: 401 });
    expect(onUnauth).toHaveBeenCalledTimes(1);
    await expect(request("/api/x503")).rejects.toEqual(new ApiError(503, "agent_unavailable"));
    await expect(request("http://localhost:8000/query" as string)).rejects.toThrow();
    setUnauthorizedHandler(() => {});
  });
  it("네트워크 오류 → ApiError(0, network)", async () => {
    server.use(http.get("/api/down", () => HttpResponse.error()));
    await expect(request("/api/down")).rejects.toMatchObject({ status: 0, code: "network" });
  });
});

describe("lint:tokens", () => {
  it("hex 색·px·글꼴 이름을 잡아낸다", () => {
    expect(lintText('const c = "#FFC94D";').length).toBe(1);
    expect(lintText('<div style={{ margin: "12px" }} />').length).toBe(1);
    expect(lintText('font-family: "Jua";').length).toBe(1);
    expect(lintText('<div className="bg-surface p-4" />')).toEqual([]);
  });
});

describe("lint:tokens 허용 표시", () => {
  it("lint-tokens-allow: font는 글꼴 규칙만 건너뛴다", () => {
    const text = '// lint-tokens-allow: font\nconst a = "Jua"; const c = "#FFF";';
    expect(lintText(text).map((p: { message: string }) => p.message)).toEqual(["hex 색은 tokens.css에만"]);
  });
});
