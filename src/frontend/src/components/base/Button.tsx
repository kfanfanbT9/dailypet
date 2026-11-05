// 알약 버튼 (Style-guide.md 7.1). 변형: primary / secondary / ghost / danger / danger-solid, 크기 md / sm.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-solid";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:[background:var(--button-primary-bg-hover)]",
  secondary: "bg-surface text-primary [border:var(--border-input)_solid_var(--color-primary)]",
  ghost: "bg-transparent text-primary hover:bg-sky",
  danger: "bg-surface text-danger [border:var(--border-input)_solid_var(--color-danger)]",
  "danger-solid": "bg-danger [color:var(--color-on-danger)]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    disabled,
    className = "",
    children,
    type = "button",
    onClick,
    ...rest
  },
  ref,
) {
  const inactive = disabled || loading;
  const sizing =
    size === "md"
      ? "min-h-btn-md px-6 text-body font-bold"
      : "min-h-btn-sm px-4 text-small font-bold relative after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']";
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-disabled={inactive || undefined}
      aria-busy={loading || undefined}
      {...rest}
      onClick={inactive ? (e) => e.preventDefault() : onClick}
      className={[
        "inline-flex min-w-touch items-center justify-center gap-2 rounded-pill transition-transform duration-fast ease-standard",
        "active:[transform:scale(var(--press-scale))]",
        inactive ? "cursor-not-allowed [opacity:var(--disabled-opacity)]" : "cursor-pointer",
        VARIANT[variant],
        sizing,
        className,
      ].join(" ")}
    >
      {loading ? (
        <span aria-label="처리 중" className="inline-flex gap-1">
          <span className="h-2 w-2 rounded-pill bg-current" />
          <span className="h-2 w-2 rounded-pill bg-current" />
          <span className="h-2 w-2 rounded-pill bg-current" />
        </span>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
});
