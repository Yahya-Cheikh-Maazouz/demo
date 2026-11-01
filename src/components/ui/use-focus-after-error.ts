"use client";

import { useEffect, type RefObject } from "react";

/**
 * After a failed submit, moves focus to the first invalid field of the form, or to the field
 * named `fallback` when the error is not tied to a field (e.g. wrong password). Otherwise focus
 * goes to the first link or button of `alertRef` (e.g. "Réinitialiser mon mot de passe" after a
 * lockout), or to `alertRef` itself: the submit button was disabled while pending, so without
 * this the focus would fall back to the top of the page.
 */
export function useFocusAfterError(
  formRef: RefObject<HTMLFormElement | null>,
  state: { status: string; attempt?: number },
  fallback?: string,
  alertRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (state.status !== "error") return;
    const form = formRef.current;
    if (!form) return;
    const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    const field = fallback ? form.querySelector<HTMLElement>(`[name="${fallback}"]`) : null;
    const alert = alertRef?.current;
    const alertTarget = alert ? (alert.querySelector<HTMLElement>("a[href], button") ?? alert) : null;
    (invalid ?? field ?? alertTarget)?.focus();
  }, [formRef, state, fallback, alertRef]);
}
