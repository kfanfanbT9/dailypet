// 앱 시작 시 GET /api/me로 로그인 여부 판단. 401이면 /login?next=<원래 경로>.
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Mascot } from "@/components/mascot/Mascot";
import { useMe } from "@/hooks/queries";

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const loc = useLocation();
  if (me.isLoading) {
    return (
      <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-3">
        <Mascot species="dog" size={96} decorative />
        <span className="text-muted">불러오는 중이에요</span>
      </div>
    );
  }
  if (me.isError || !me.data) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
