// 입력란 (Style-guide.md 7.2): 라벨은 항상 위, 오류는 아래 ⚠️ + aria-describedby, 높이 48px.
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

const CONTROL =
  "w-full min-h-btn-md rounded-input bg-surface px-4 text-body text-text [border:var(--border-input)_solid_var(--color-border)] " +
  "aria-[invalid=true]:[border-color:var(--color-danger)]";

interface FieldShellProps {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}

export function FieldShell({ label, error, hint, required, children }: FieldShellProps) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-small font-bold text-text">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger">
            {" "}
            *
          </span>
        )}
        {required && <span className="sr-only"> (필수)</span>}
      </label>
      {children({ id, describedBy })}
      {hint && (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-caption text-danger">
          <span aria-hidden="true">⚠️ </span>
          {error}
        </p>
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  unit?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, unit, required, className = "", ...rest },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy }) => (
        <div className="relative">
          <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className={`${CONTROL} ${unit ? "pr-12" : ""} ${className}`}
            {...rest}
          />
          {unit && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted"
            >
              {unit}
            </span>
          )}
        </div>
      )}
    </FieldShell>
  );
});

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, hint, required, className = "", ...rest },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy }) => (
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} py-3 ${className}`}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, required, className = "", children, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy }) => (
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} ${className}`}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
});
