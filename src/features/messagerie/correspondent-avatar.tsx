import { School } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { MessageParty } from "@/lib/types";
import { nameInitials } from "./wording";

/** Initials for the instructor, a school icon for the auto-école. Decorative: the name is written next to it. */
export function CorrespondentAvatar({ party }: { party: { kind: MessageParty; name: string } }) {
  if (party.kind === "ecole") {
    return (
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted">
        <School className="size-5" />
      </span>
    );
  }
  return <Avatar initials={nameInitials(party.name)} />;
}
