// 라우팅 리다이렉트(폴백) 규칙 (wireframe.md 0장)
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safeNext";
import { MOCK_PASSWORD } from "@/mocks/db";
import { renderApp } from "@/test/render";
import { NOT_FOUND_TOAST, PET_NOT_FOUND_TOAST } from "./RouteFallback";

describe("라우팅 리다이렉트(폴백)", () => {
  it("정의되지 않은 경로 → 홈 + 안내 토스트", async () => {
    renderApp("/no-such-page");
    expect(await screen.findByText(NOT_FOUND_TOAST)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /오늘의 할 일/ })).toBeInTheDocument();
  });

  it("정의되지 않은 경로 + 비로그인 → 로그인 화면", async () => {
    renderApp("/no-such-page", { as: null });
    expect(await screen.findByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  it("이미 로그인 상태로 /login → 홈, next가 있으면 그 경로", async () => {
    const a = renderApp("/login");
    expect(await screen.findByRole("heading", { name: /오늘의 할 일/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "로그인" })).not.toBeInTheDocument();
    a.unmount();
    renderApp("/login?next=%2Fhealth");
    expect(await screen.findByRole("heading", { name: /건강 일정/ })).toBeInTheDocument();
  });

  it("이미 로그인 상태로 /signup → 홈", async () => {
    renderApp("/signup");
    expect(await screen.findByRole("heading", { name: /오늘의 할 일/ })).toBeInTheDocument();
  });

  it("로그인 화면에서 방금 로그인하면 GuestOnly가 가로채지 않고 화면 규칙(next)을 따른다", async () => {
    const { user } = renderApp("/login?next=%2Fhealth", { as: null });
    await user.type(await screen.findByLabelText("이메일"), "haneul@demo.dailypet");
    await user.type(screen.getByLabelText("비밀번호"), MOCK_PASSWORD);
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(await screen.findByRole("heading", { name: /건강 일정/ })).toBeInTheDocument();
  });

  it("없거나 남의 반려동물 수정 화면 → 반려동물 목록 + 안내 토스트", async () => {
    renderApp("/pets/pet_mocha/edit"); // 지우(이지우) 로그인, 모카는 서준의 반려동물 → 404
    expect(await screen.findByText(PET_NOT_FOUND_TOAST)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "우리 아이들" })).toBeInTheDocument());
  });

  it("next는 앱 안 경로만 허용 (역슬래시 우회 포함)", () => {
    expect(safeNext("/health?pet=pet_bori")).toBe("/health?pet=pet_bori");
    for (const bad of [
      "//evil.example",
      "/\\evil.example",
      "https://evil.example",
      "javascript:alert(1)",
      "",
    ])
      expect(safeNext(bad)).toBeNull();
  });
});
