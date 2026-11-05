// 유일한 HTTP 진입점 (phase3_task.md 1.5). 상대 경로 /api/... 만 부른다 — Backend만 호출 (CLAUDE.md 4.2).
import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public serverMessage = "",
    public fields: string[] = [],
  ) {
    super(code);
    this.name = "ApiError";
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => {};

/** 401 전역 처리 콜백 (캐시 비우고 로그인으로). App이 등록한다. */
export function setUnauthorizedHandler(fn: UnauthorizedHandler) {
  onUnauthorized = fn;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
  /** 401을 전역 처리하지 않는다 (로그인 확인·로그인 요청 등) */
  skipAuthRedirect?: boolean;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!path.startsWith("/api/")) throw new Error("Backend /api/* 만 호출한다");
  const qs = opts.query
    ? new URLSearchParams(
        Object.entries(opts.query).filter(([, v]) => v !== undefined) as [string, string][],
      ).toString()
    : "";
  let res: Response;
  try {
    res = await fetch(qs ? `${path}?${qs}` : path, {
      method: opts.method ?? "GET",
      credentials: "include",
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network");
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as ApiErrorBody | null)?.error;
    const apiErr = new ApiError(
      res.status,
      err?.code ?? `http_${res.status}`,
      err?.message ?? "",
      err?.fields?.map((f) => f.field) ?? [],
    );
    if (res.status === 401 && !opts.skipAuthRedirect) onUnauthorized();
    throw apiErr;
  }
  return data as T;
}
