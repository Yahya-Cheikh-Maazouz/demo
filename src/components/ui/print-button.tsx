"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Opens the print dialog, where "Enregistrer au format PDF" saves the document.
 * The document title becomes the suggested file name for the time of the dialog.
 */
export function PrintButton({ fileName, className }: { fileName: string; className?: string }) {
  function print() {
    const previousTitle = document.title;
    document.title = fileName;
    window.addEventListener("afterprint", () => (document.title = previousTitle), { once: true });
    window.print();
  }

  return (
    <Button onClick={print} className={className} icon={<Download className="size-4" aria-hidden />}>
      Télécharger en PDF
    </Button>
  );
}
