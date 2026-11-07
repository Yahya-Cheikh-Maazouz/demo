import { CircleCheck, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LessonLight } from "@/lib/types";

const LIGHTS = {
  vert: {
    text: "La leçon peut avoir lieu",
    icon: CircleCheck,
    box: "border-success/25 bg-success-soft text-success",
    dot: "bg-success ring-success/20",
  },
  rouge: {
    text: "Paiement à régulariser : orientez l'élève vers l'accueil",
    icon: CircleAlert,
    box: "border-danger/25 bg-danger-soft text-danger",
    dot: "bg-danger ring-danger/20",
  },
} as const;

/**
 * Green or red light of a confirmed lesson. The instructor never sees the student's balance: no
 * hours, no amount, only whether the lesson can take place. Text and icon, never the color alone.
 */
export function LessonLightIndicator({ light, className }: { light: LessonLight; className?: string }) {
  const meta = LIGHTS[light];
  const Icon = meta.icon;
  return (
    <p className={cn("flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-sm font-semibold", meta.box, className)}>
      <span aria-hidden className={cn("mt-1 size-3 shrink-0 rounded-full ring-4", meta.dot)} />
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <span className="sr-only">{light === "vert" ? "Feu vert : " : "Feu rouge : "}</span>
        {meta.text}
      </span>
    </p>
  );
}
