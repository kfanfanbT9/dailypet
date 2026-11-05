// W02 가입. 이메일은 입력 그대로 보여 주고 서버가 소문자로 저장한다. 409 → 이메일 칸 아래 안내.
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/client";
import { auth } from "@/api/endpoints";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Field";
import { DreamBackdrop } from "@/components/brand/DreamBackdrop";
import { LogoMark } from "@/components/brand/Logo";
import { qk } from "@/hooks/queries";
import { errorMessage } from "@/lib/messages";

type Field = "email" | "password" | "nickname" | "agree";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function W02Signup() {
  const [form, setForm] = useState({ email: "", password: "", nickname: "", agree: false });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const agreeRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  function validate(): Partial<Record<Field, string>> {
    const e: Partial<Record<Field, string>> = {};
    if (!EMAIL_RE.test(form.email.trim())) e.email = "이메일 형식을 확인해 주세요";
    if (form.password.length < 8) e.password = "비밀번호는 8자 이상이에요";
    if (form.password.length > 72) e.password = "비밀번호는 72자 이하로 정해 주세요";
    if (!form.nickname.trim() || form.nickname.trim().length > 20)
      e.nickname = "닉네임은 1~20자로 정해 주세요";
    if (!form.agree) e.agree = "데모 서비스 이용 안내를 확인해 주세요";
    return e;
  }

  function focusFirst(e: Partial<Record<Field, string>>) {
    const first = (["email", "password", "nickname", "agree"] as Field[]).find((f) => e[f]);
    const target = { email: emailRef, password: passwordRef, nickname: nicknameRef, agree: agreeRef };
    if (first) target[first].current?.focus();
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return focusFirst(e);
    setBusy(true);
    try {
      const me = await auth.signup(form.email, form.password, form.nickname);
      qc.clear();
      qc.setQueryData(qk.me, me);
      qc.setQueryData(qk.pets, []);
      navigate("/pets/new", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const next = { email: "이미 사용 중인 이메일이에요" };
        setErrors(next);
        focusFirst(next);
      } else if (err instanceof ApiError && err.status === 400 && err.fields.length) {
        const next: Partial<Record<Field, string>> = {};
        for (const f of err.fields)
          if (["email", "password", "nickname"].includes(f)) next[f as Field] = "입력한 내용을 확인해 주세요";
        setErrors(next);
        focusFirst(next);
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === "agree" ? e.target.checked : e.target.value }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-modal flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-2">
        <Link
          to="/login"
          aria-label="뒤로"
          className="flex min-h-touch min-w-touch items-center justify-center text-text"
        >
          <ArrowLeft aria-hidden="true" />
        </Link>
        <h1 className="font-display text-title-1 text-text">가입하기</h1>
      </header>
      <DreamBackdrop className="rounded-card" />
      <div className="flex items-center gap-3">
        <LogoMark size={96} />
        <p className="font-display text-title-2 text-text">만나서 반가워요! 몇 가지만 알려주세요</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          ref={emailRef}
          label="이메일"
          required
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
        />
        <Input
          ref={passwordRef}
          label="비밀번호"
          required
          type="password"
          autoComplete="new-password"
          hint="8자 이상"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
        />
        <Input
          ref={nicknameRef}
          label="닉네임"
          required
          autoComplete="nickname"
          value={form.nickname}
          onChange={set("nickname")}
          error={errors.nickname}
        />
        <div className="flex flex-col gap-1">
          <label className="flex min-h-touch items-center gap-3 text-body">
            <input
              ref={agreeRef}
              type="checkbox"
              checked={form.agree}
              onChange={set("agree")}
              aria-invalid={errors.agree ? true : undefined}
              aria-describedby={errors.agree ? "agree-err" : "agree-hint"}
              className="h-6 w-6"
            />
            데모 서비스 이용 안내를 확인했어요
          </label>
          <p id="agree-hint" className="text-caption text-muted">
            로컬 데모 서비스예요. 실제 개인정보를 입력하지 마세요.
          </p>
          {errors.agree && (
            <p id="agree-err" className="text-caption text-danger">
              <span aria-hidden="true">⚠️ </span>
              {errors.agree}
            </p>
          )}
        </div>
        {formError && (
          <p role="alert" className="text-small text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" loading={busy}>
          가입하기
        </Button>
      </form>
    </main>
  );
}
