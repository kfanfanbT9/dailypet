// 라우팅 리다이렉트(폴백) — wireframe.md 0장 "라우팅 리다이렉트(폴백) 규칙".
// 이동은 모두 replace로 해서 뒤로 가기에 잘못된 주소가 남지 않게 한다.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/base/Toast";
import { useMe } from "@/hooks/queries";
import { safeNext } from "@/lib/safeNext";

export const NOT_FOUND_TOAST = "찾을 수 없는 화면이라 홈으로 이동했어요";

/** 이미 로그인했으면 /login·/signup 대신 next(앱 안 경로만) 또는 홈으로 보낸다. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const me = useMe();
  const [params] = useSearchParams();
  // 들어올 때의 로그인 상태로만 판단한다. 이 화면에서 방금 로그인·가입한 경우(캐시에 me가 생김)는
  // 화면이 직접 /pets/new 또는 next로 보내므로 여기서 가로채지 않는다.
  const [loggedInOnEntry, setLoggedInOnEntry] = useState<boolean | null>(null);
  const settled = !me.isLoading;
  const loggedIn = me.isSuccess && Boolean(me.data);
  // 처음 확인이 끝난 렌더에서 한 번만 기록한다 (React의 "렌더 중 상태 조정" 패턴, effect 불필요)
  if (loggedInOnEntry === null && settled) setLoggedInOnEntry(loggedIn);
  if (loggedInOnEntry ?? (settled && loggedIn))
    return <Navigate to={safeNext(params.get("next")) ?? "/"} replace />;
  return <>{children}</>;
}

export const PET_NOT_FOUND_TOAST = "반려동물을 찾을 수 없어 목록으로 이동했어요";

/** 안내 토스트를 띄우고 다른 화면으로 replace 이동한다. */
export function RedirectWithToast({ to, message }: { to: string; message: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const done = useRef(false); // StrictMode에서 effect가 두 번 돌아도 토스트는 한 번
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    toast(message);
    navigate(to, { replace: true });
  }, [navigate, toast, to, message]);
  return null;
}

/** 정의되지 않은 경로 → 홈(로그인 안 됐으면 RequireAuth가 다시 /login으로) + 안내 토스트. */
export function NotFoundRedirect() {
  return <RedirectWithToast to="/" message={NOT_FOUND_TOAST} />;
}
