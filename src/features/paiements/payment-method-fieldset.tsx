"use client";

import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/cn";
import { ONLINE_METHODS, PAYMENT_METHOD_META, type OnlineMethod } from "./payment-meta";
import { RadioCard } from "./radio-card";

const DESCRIPTIONS: Record<OnlineMethod, { title: string; description: string }> = {
  carte: { title: "Carte bancaire", description: "CB, Visa ou Mastercard" },
  klarna: { title: "Klarna", description: "Payer en 3 fois sans frais" },
};

type PaymentMethodFieldsetProps = {
  legend: string;
  name?: string;
  /** Controlled value; or use `defaultValue` for an uncontrolled group. */
  value?: OnlineMethod;
  onChange?: (method: OnlineMethod) => void;
  defaultValue?: OnlineMethod;
  error?: string;
  className?: string;
};

/** "Carte bancaire" or "Klarna — payer en 3 fois sans frais", as radio cards. */
export function PaymentMethodFieldset({
  legend,
  name = "method",
  value,
  onChange,
  defaultValue,
  error,
  className,
}: PaymentMethodFieldsetProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <fieldset className={className}>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {ONLINE_METHODS.map((method) => {
          const { icon: Icon } = PAYMENT_METHOD_META[method];
          const { title, description } = DESCRIPTIONS[method];
          return (
            <RadioCard
              key={method}
              name={name}
              value={method}
              checked={value === undefined ? undefined : value === method}
              defaultChecked={defaultValue === undefined ? undefined : defaultValue === method}
              onChange={onChange ? () => onChange(method) : undefined}
              aria-labelledby={`${id}-${method}-title`}
              aria-describedby={cn(`${id}-${method}-description`, error && errorId)}
              invalid={Boolean(error)}
              className="items-center"
            >
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-ink-muted group-has-checked:bg-surface group-has-checked:text-brand"
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span id={`${id}-${method}-title`} className="block font-semibold text-ink">
                    {title}
                  </span>
                  <span id={`${id}-${method}-description`} className="block text-sm text-ink-muted">
                    {description}
                  </span>
                </span>
              </span>
            </RadioCard>
          );
        })}
      </div>
    </fieldset>
  );
}
