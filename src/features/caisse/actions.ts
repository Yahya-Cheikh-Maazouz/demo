"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { recordCashEntry, reviewCashEntry } from "@/lib/api/gestion";
import { formatCurrency } from "@/lib/format";
import type { CashMethod } from "@/lib/types";
import type { CashActionState } from "./action-state";

const ID = /^[\w:.-]{1,160}$/;
const METHODS: CashMethod[] = ["especes", "cheque", "carte", "virement"];
const MAX_AMOUNT = 5000;
const NETWORK_ERROR = "Le serveur n'a pas répondu. Vérifiez votre connexion puis réessayez.";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** "1 200,50" or "1200.50" → 1200.5 */
function parseAmount(raw: string): number {
  return Number(raw.replace(/[\s  €]/g, "").replace(",", "."));
}

export async function recordCashAction(prev: CashActionState, formData: FormData): Promise<CashActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const studentId = read(formData, "studentId");
  const amount = parseAmount(read(formData, "amount"));
  const method = read(formData, "method") as CashMethod;
  const hours = Number(read(formData, "hours").replace(",", "."));
  const note = read(formData, "note").slice(0, 200);

  const fieldErrors: CashActionState["fieldErrors"] = {};
  if (!ID.test(studentId)) fieldErrors.studentId = "Choisissez l'élève.";
  if (!Number.isFinite(amount) || amount <= 0) fieldErrors.amount = "Saisissez un montant, par exemple 300 ou 120,50.";
  else if (amount > MAX_AMOUNT) fieldErrors.amount = `Le montant ne peut pas dépasser ${formatCurrency(MAX_AMOUNT, { round: true })}.`;
  if (!METHODS.includes(method)) fieldErrors.method = "Choisissez le moyen de paiement.";
  if (!Number.isFinite(hours) || hours < 0 || hours > 60 || (hours * 2) % 1 !== 0) {
    fieldErrors.hours = "Saisissez un nombre d'heures par demi-heure, par exemple 5 ou 1,5 (0 pour des frais).";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", code: "champs", message: "Vérifiez les champs signalés.", fieldErrors, attempt };
  }

  try {
    const result = await recordCashEntry({ studentId, amount: Math.round(amount * 100) / 100, method, hours, note });
    if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };
    refresh();
    const { entry } = result.data;
    return {
      status: "success",
      code: entry.status,
      message:
        entry.status === "a_valider"
          ? `Encaissement de ${formatCurrency(entry.amount)} enregistré. Il dépasse le seuil : le gérant doit le valider avant que les heures soient créditées.`
          : `Encaissement de ${formatCurrency(entry.amount)} enregistré. Facture ${entry.invoiceNumber} envoyée à l'élève.`,
      attempt,
    };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}

/** decision=valide or decision=refuse on an entry waiting for the gérant. */
export async function reviewCashAction(prev: CashActionState, formData: FormData): Promise<CashActionState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const entryId = read(formData, "entryId");
  const decision = read(formData, "decision");
  if (!ID.test(entryId) || (decision !== "valide" && decision !== "refuse")) {
    return { status: "error", code: "invalide", message: "Action impossible sur cet encaissement.", attempt };
  }
  try {
    const result = await reviewCashEntry(entryId, decision);
    if (!result.ok) return { status: "error", code: result.code, message: result.error, attempt };
    refresh();
    return { status: "success", message: decision === "valide" ? "Encaissement validé." : "Encaissement refusé.", attempt };
  } catch (error) {
    unstable_rethrow(error);
    return { status: "error", code: "reseau", message: NETWORK_ERROR, attempt };
  }
}
