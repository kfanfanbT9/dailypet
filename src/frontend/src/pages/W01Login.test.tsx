import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { db } from "@/mocks/db";
import { renderApp } from "@/test/render";
import { LOGIN_FAILED, safeNext } from "./W01Login";

async function login(user: ReturnType<typeof renderApp>["user"], email: string, password: string) {
  await user.type(screen.getByLabelText("이메일"), email);
  await user.type(screen.getByLabelText("비밀번호"), password);
  await user.click(screen.getByRole("button", { name: "로그인" }));
}

describe("W01 로그인", () => {
  it("실패 문구가 없는 이메일과 틀린 비밀번호에서 같다", async () => {
    const a = renderApp("/login", { as: null });
    await login(a.user, "nobody@demo.dailypet", "Demo!2345");
    const first = (await screen.findByRole("alert")).textContent;
    a.unmount();
    const b = renderApp("/login", { as: null });
    await login(b.user, "jiwoo@demo.dailypet", "wrong-password");
    const second = (await screen.findByRole("alert")).textContent;
    expect(first).toContain(LOGIN_FAILED);
    expect(second).toBe(first);
  });

  it("비로그인으로 /health → /login?next=/health → 로그인 후 /health", async () => {
    const { user } = renderApp("/health", { as: null });
    await screen.findByRole("button", { name: "로그인" });
    await login(user, "haneul@demo.dailypet", "Demo!2345");
    await waitFor(() => expect(db.session).toBe("usr_1c3544ae18bc"));
    expect(await screen.findByRole("heading", { name: /건강 일정|W07Health/ })).toBeInTheDocument();
  });

  it("next는 앱 안 경로만 허용", () => {
    expect(safeNext("/health")).toBe("/health");
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("https://evil.example")).toBeNull();
  });
});
