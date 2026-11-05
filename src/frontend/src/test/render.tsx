// 화면 테스트 도우미: 목 DB에 로그인 상태를 만들고 앱 전체를 메모리 라우터로 렌더한다.
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AppRoutes, Providers, makeQueryClient } from "@/App";
import { db } from "@/mocks/db";
import { server } from "@/mocks/server";

export const USERS = {
  haneul: "usr_1c3544ae18bc",
  seojun: "usr_a80678fb2f7a",
  jiwoo: "usr_69d308a849e0",
  youngja: "usr_d6eff68d8ef0",
  mallory: "usr_39e92ecdda26",
  leaver: "usr_3263e0395d81",
} as const;

export function renderApp(
  path: string,
  opts: { as?: keyof typeof USERS | null; today?: string; fakeTimers?: boolean } = {},
) {
  db.session = opts.as === null ? null : USERS[opts.as ?? "jiwoo"];
  if (opts.today) db.today = opts.today;
  const client = makeQueryClient();
  const user = userEvent.setup(opts.fakeTimers ? { advanceTimers: vi.advanceTimersByTime } : {});
  const utils = render(
    <Providers client={client} initialPath={path}>
      <AppRoutes />
    </Providers>,
  );
  return { ...utils, user, client };
}

/** MSW로 나간 요청 기록 (메서드·경로) — "요청 0회", "pet_mocha가 쓰이지 않음" 확인용 */
export function recordRequests() {
  const calls: { method: string; path: string }[] = [];
  const onStart = ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    calls.push({ method: request.method, path: url.pathname + url.search });
  };
  server.events.on("request:start", onStart);
  return {
    calls,
    count: (method: string, path: string | RegExp) =>
      calls.filter(
        (c) => c.method === method && (typeof path === "string" ? c.path === path : path.test(c.path)),
      ).length,
    stop: () => server.events.removeListener("request:start", onStart),
  };
}
