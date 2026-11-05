// W01 첫 화면 · 로그인. 실패 문구는 계정 존재 여부를 알리지 않는다.
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { auth, pets } from "@/api/endpoints";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Field";
import { Mascot } from "@/components/mascot/Mascot";
import { qk } from "@/hooks/queries";
import { errorMessage } from "@/lib/messages";

export const LOGIN_FAILED = "이메일 또는 비밀번호가 맞지 않아요";

/** next 파라미터는 앱 안의 경로만 허용 (열린 리다이렉트 방지) */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export default function W01Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qc = useQueryClient();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요");
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const me = await auth.login(email, password);
      qc.clear();
      qc.setQueryData(qk.me, me);
      const list = await pets.list();
      qc.setQueryData(qk.pets, list);
      navigate(list.length === 0 ? "/pets/new" : (safeNext(params.get("next")) ?? "/"), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? LOGIN_FAILED : errorMessage(err));
      emailRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-modal flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex gap-4">
          <Mascot species="dog" mood="happy" size={96} decorative />
          <Mascot species="cat" mood="happy" size={96} decorative />
        </div>
        <h1 className="font-display text-display text-text">DailyPet</h1>
        <p className="text-muted">오늘도 우리 아이와 반짝이는 하루를!</p>
      </div>
      {params.get("bye") === "1" && (
        <p role="status" className="rounded-card bg-info-bg p-3 text-center text-body">
          그동안 함께해 줘서 고마워요
        </p>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          ref={emailRef}
          label="이메일"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="relative">
          <Input
            label="비밀번호"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-12"
          />
          <button
            type="button"
            aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
            className="absolute bottom-0 right-1 flex min-h-btn-md min-w-touch items-center justify-center text-muted"
          >
            {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-small text-danger">
            <span aria-hidden="true">⚠️ </span>
            {error}
          </p>
        )}
        <Button type="submit" loading={busy}>
          로그인
        </Button>
      </form>
      <p className="text-center text-muted">
        처음이신가요?{" "}
        <Link to="/signup" className="font-bold">
          시작하기 · 가입
        </Link>
      </p>
    </main>
  );
}
