"use client";

import { RevealValue } from "@/components/ui/reveal-value";
import { maskNeph } from "@/lib/format";

/** NEPH masked by default, with a button to show or hide it in full. */
export function NephValue({ neph }: { neph: string | null }) {
  if (!neph) return <span className="font-medium text-ink-subtle italic">En attente de l&apos;enregistrement ANTS</span>;
  return (
    <RevealValue
      value={<span className="tracking-wider">{neph}</span>}
      masked={maskNeph(neph)}
      maskedLabel={`masqué, se termine par ${neph.slice(-2)}`}
      noun="le NEPH"
    />
  );
}
