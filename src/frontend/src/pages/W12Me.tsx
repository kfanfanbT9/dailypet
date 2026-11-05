// W12 내 정보·설정 (F0): 닉네임·이메일, 테마·움직임 줄이기(즉시 적용, 서버 저장 없음), 로그아웃, 회원 탈퇴, 라이선스.
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/api/endpoints";
import { Button } from "@/components/base/Button";
import { ConfirmModal } from "@/components/base/Modal";
import { useToast } from "@/components/base/Toast";
import { useMe } from "@/hooks/queries";
import { errorMessage } from "@/lib/messages";
import { useSettings, type ThemeSetting } from "@/state/settings";

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: "auto", label: "자동 (기기 설정)" },
  { value: "light", label: "밝게" },
  { value: "dark", label: "밤하늘" },
];

export default function W12Me() {
  const me = useMe();
  const { theme, setTheme, reduceMotion, setReduceMotion } = useSettings();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    try {
      await auth.logout();
    } catch {
      // 세션이 이미 끝났어도 로그인 화면으로 간다
    }
    qc.clear();
    navigate("/login", { replace: true });
  };

  const leave = async () => {
    if (!me.data) return;
    setBusy(true);
    try {
      await auth.deleteMe(me.data.email);
      qc.clear();
      navigate("/login?bye=1", { replace: true });
    } catch (e) {
      toast(errorMessage(e), { tone: "error" });
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-title-1">내 정보</h1>
      <section aria-label="계정" className="rounded-card bg-surface p-4 shadow-1">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body">
          <dt className="text-muted">닉네임</dt>
          <dd className="font-bold">{me.data?.nickname ?? "-"}</dd>
          <dt className="text-muted">이메일</dt>
          <dd className="wrap-anywhere">{me.data?.email ?? "-"}</dd>
        </dl>
      </section>

      <section aria-label="화면 설정" className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-1">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-body font-bold">테마</legend>
          {THEMES.map((t) => (
            <label key={t.value} className="flex min-h-touch cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="theme"
                value={t.value}
                checked={theme === t.value}
                onChange={() => setTheme(t.value)}
              />
              {t.label}
            </label>
          ))}
        </fieldset>
        <label className="flex min-h-touch cursor-pointer items-center gap-2">
          <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
          움직임 줄이기
        </label>
      </section>

      <section aria-label="계정 관리" className="flex flex-col items-start gap-2">
        <Link to="/licenses" className="inline-flex min-h-touch items-center text-body text-primary underline">
          오픈소스·에셋 정보
        </Link>
        <Button variant="secondary" onClick={() => void logout()}>
          로그아웃
        </Button>
        <Button variant="danger" onClick={() => setLeaving(true)}>
          회원 탈퇴
        </Button>
      </section>

      <ConfirmModal
        open={leaving}
        title="회원 탈퇴"
        confirmLabel="탈퇴하기"
        danger
        busy={busy}
        onClose={() => setLeaving(false)}
        onConfirm={leave}
        typeToConfirm={{
          label: "가입한 이메일을 입력해 주세요",
          value: me.data?.email ?? "\u0000",
          normalize: (s) => s.trim().toLowerCase(),
        }}
      >
        <p>반려동물·할 일·대화 기록이 모두 지워지고 되살릴 수 없어요.</p>
      </ConfirmModal>
    </div>
  );
}
