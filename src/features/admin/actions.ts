"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { changeSchoolPlan, createSchool, setSchoolStatus } from "@/lib/api/admin";
import type { NewSchoolInput, SchoolStatusAction } from "@/lib/types";
import type { CreateSchoolField, CreateSchoolState, SchoolActionState } from "./action-state";

const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";
const SLUG = /^[a-z0-9-]{1,40}$/;
const PLAN_ID = /^[\w-]{1,40}$/;
const FIELDS: readonly string[] = ["name", "siret", "gerantEmail", "planId", "slug", "trialDays"] satisfies CreateSchoolField[];
const STATUS_ACTIONS: readonly string[] = ["echec_paiement", "fin_delai_grace", "suspendre", "reactiver"] satisfies SchoolStatusAction[];

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Keeps the API field errors this form shows next to a field. */
function formFieldErrors(errors: Record<string, string> | undefined): CreateSchoolState["fieldErrors"] {
  return Object.fromEntries(Object.entries(errors ?? {}).filter(([field]) => FIELDS.includes(field)));
}

/** Creates the school and its gérant's account; the success state carries the provisional password. */
export async function createSchoolAction(prev: CreateSchoolState, formData: FormData): Promise<CreateSchoolState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const values = {
    name: read(formData, "name").slice(0, 120),
    siret: read(formData, "siret").replace(/\s/g, "").slice(0, 20),
    gerantEmail: read(formData, "gerantEmail").slice(0, 200),
    planId: read(formData, "planId"),
    slug: read(formData, "slug").toLowerCase().slice(0, 40),
    trialDays: read(formData, "trialDays"),
  };

  // Presence and shape only: the API checks the SIRET key, the reserved and taken subdomains.
  const fieldErrors: Partial<Record<CreateSchoolField, string>> = {};
  if (!values.name) fieldErrors.name = "Indiquez le nom de l'auto-école.";
  if (!values.siret) fieldErrors.siret = "Indiquez le numéro SIRET (14 chiffres).";
  if (!values.gerantEmail) fieldErrors.gerantEmail = "Indiquez l'e-mail du gérant : il y recevra son invitation.";
  if (!PLAN_ID.test(values.planId)) fieldErrors.planId = "Choisissez une formule.";
  if (!values.slug) fieldErrors.slug = "Choisissez le sous-domaine de l'auto-école.";
  const trialDays = Number(values.trialDays);
  if (trialDays !== 0 && trialDays !== 14 && trialDays !== 30) fieldErrors.trialDays = "Choisissez la durée de l'essai.";
  if (Object.keys(fieldErrors).length > 0) return { status: "error", fieldErrors, values, attempt };

  const input: NewSchoolInput = { ...values, trialDays: trialDays as NewSchoolInput["trialDays"] };
  try {
    const result = await createSchool(input);
    if (!result.ok) {
      const errors = formFieldErrors(result.fieldErrors);
      return errors && Object.keys(errors).length > 0
        ? { status: "error", code: result.code, fieldErrors: errors, values, attempt }
        : { status: "error", code: result.code, message: result.error, values, attempt };
    }
    refresh();
    return { status: "success", created: result.data.school, attempt };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, values, attempt };
  }
}

const STATUS_DONE: Record<SchoolStatusAction, string> = {
  echec_paiement: "Échec de paiement enregistré : l'abonnement est impayé et le gérant est prévenu.",
  fin_delai_grace: "Délai de grâce terminé : l'espace de l'auto-école est en lecture seule.",
  suspendre: "Auto-école suspendue : seul le gérant peut encore se connecter.",
  reactiver: "Abonnement actif : l'espace de l'auto-école fonctionne de nouveau normalement.",
};

/** Changes the subscription status of a school (simulated Stripe events, suspension, reactivation). */
export async function setSchoolStatusAction(prev: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const slug = read(formData, "slug");
  const action = read(formData, "action");
  if (!SLUG.test(slug) || !STATUS_ACTIONS.includes(action)) {
    return { status: "error", code: "invalide", message: "Action impossible sur cette auto-école.", attempt };
  }
  try {
    const result = await setSchoolStatus(slug, action as SchoolStatusAction);
    if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };
    refresh();
    return { status: "success", message: STATUS_DONE[action as SchoolStatusAction], attempt };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}

export async function changeSchoolPlanAction(prev: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const slug = read(formData, "slug");
  const planId = read(formData, "planId");
  if (!SLUG.test(slug)) return { status: "error", code: "invalide", message: "Auto-école introuvable.", attempt };
  if (!PLAN_ID.test(planId)) return { status: "error", code: "invalide", message: "Choisissez une formule.", attempt };
  try {
    const result = await changeSchoolPlan(slug, planId);
    if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };
    refresh();
    return { status: "success", message: `Formule changée : ${result.data.plan.name}.`, attempt };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}
