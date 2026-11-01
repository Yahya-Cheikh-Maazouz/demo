import { useId, type ComponentProps, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/** 48px high and 16px text so iOS does not zoom on focus. */
export const inputStyles = cn(
  "block h-12 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-base text-ink",
  "placeholder:text-ink-subtle transition-[border-color,box-shadow] duration-150",
  "focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15",
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-subtle",
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15",
);

type FieldProps = {
  label: ReactNode;
  /** Persistent help text under the input. */
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Extra element aligned right of the label (e.g. "Mot de passe oublié ?"). */
  labelAside?: ReactNode;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/** Label + control + hint/error, wired with ids and aria attributes. */
export function Field({ label, hint, error, required, labelAside, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {required && (
            <span className="text-danger" aria-hidden>
              {" "}
              *
            </span>
          )}
        </label>
        {labelAside}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-sm text-ink-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "children"> &
  Pick<FieldProps, "label" | "hint" | "error" | "labelAside">;

export function TextField({ label, hint, error, labelAside, required, className, ...props }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} labelAside={labelAside} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          className={inputStyles}
          {...props}
        />
      )}
    </Field>
  );
}
