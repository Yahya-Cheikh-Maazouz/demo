"use server";

import { refresh } from "next/cache";
import { getHourPacks, getInstallments, payInstallment, purchaseHourPack } from "@/lib/api/eleve";
import { isOnlineMethod } from "./payment-meta";
import type { PaymentState } from "./payment-state";

// Today the mock API settles the payment at once. With Stripe, these actions will create a
// Checkout Session on the school's connected account and redirect() to it; the invoice is then
// issued by the backend when the Stripe webhook confirms the payment.

const METHOD_ERROR = "Choisissez un moyen de paiement : carte bancaire ou Klarna.";

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function buyHourPack(prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const packId = readText(formData, "packId");
  const method = readText(formData, "method");

  // Re-read the offer from the API: the price and hours never come from the browser.
  const pack = (await getHourPacks()).find((p) => p.id === packId);
  if (!pack) {
    const message = packId ? "Cette offre n'est plus disponible. Choisissez-en une autre." : "Choisissez un pack d'heures.";
    return { status: "error", message, fieldErrors: { packId: message }, attempt };
  }
  if (!isOnlineMethod(method)) {
    return { status: "error", message: METHOD_ERROR, fieldErrors: { method: METHOD_ERROR }, attempt };
  }

  const result = await purchaseHourPack(pack.id, method);
  if (!result.ok) return { status: "error", message: result.error, attempt };

  refresh();
  const { invoice } = result.data;
  return {
    status: "success",
    attempt,
    receipt: { invoiceNumber: invoice.number, label: invoice.label, amount: invoice.amount, hours: pack.hours },
  };
}

export async function settleInstallment(prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const attempt = (prev.attempt ?? 0) + 1;
  const installmentId = readText(formData, "installmentId");
  const method = readText(formData, "method");

  if (!isOnlineMethod(method)) {
    return { status: "error", message: METHOD_ERROR, fieldErrors: { method: METHOD_ERROR }, attempt };
  }

  const installment = (await getInstallments()).find((i) => i.id === installmentId);
  if (!installment || installment.status === "payee") {
    return { status: "error", message: "Cette échéance est déjà réglée.", attempt };
  }

  const result = await payInstallment(installment.id, method);
  if (!result.ok) return { status: "error", message: result.error, attempt };

  refresh();
  const { invoice } = result.data;
  return {
    status: "success",
    attempt,
    receipt: { invoiceNumber: invoice.number, label: invoice.label, amount: invoice.amount, hours: installment.hours },
  };
}
