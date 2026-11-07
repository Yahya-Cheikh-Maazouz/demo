"use client";

import type { ComponentProps } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useOnline } from "@/components/moniteur/use-online";

/**
 * Submit button of an instructor action: disabled while offline (the offline queue of signatures
 * and livret entries comes in V1). The offline banner of the shell says why.
 */
export function OnlineSubmitButton(props: ComponentProps<typeof SubmitButton>) {
  const online = useOnline();
  return <SubmitButton {...props} {...(online ? {} : { disabled: true, title: "Indisponible hors connexion" })} />;
}
