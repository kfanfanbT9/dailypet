/** next 파라미터는 앱 안의 경로만 허용한다 (열린 리다이렉트 방지: `//evil.com`, `https://…` 거부). */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}
