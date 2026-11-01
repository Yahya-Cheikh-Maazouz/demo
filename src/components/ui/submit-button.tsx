"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./button";

/**
 * Submit button that shows a spinner while its parent <form> action is pending.
 * With several submit buttons (name + value), only the one that was clicked spins.
 */
export function SubmitButton({ children, pendingLabel, ...props }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending, data } = useFormStatus();
  const isSubmitter =
    typeof props.name === "string" && props.value !== undefined ? data?.get(props.name) === String(props.value) : true;
  const loading = pending && isSubmitter;
  return (
    <Button type="submit" loading={loading} disabled={pending && !isSubmitter} {...props}>
      {loading && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
