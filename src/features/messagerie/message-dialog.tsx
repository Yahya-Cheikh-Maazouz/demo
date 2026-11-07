"use client";

import { Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Message } from "@/lib/types";
import { CorrespondentAvatar } from "./correspondent-avatar";
import { PARTY_LABEL, formatSentAt } from "./wording";

type MessageDialogProps = {
  message: Message;
  now: string;
  onClose: () => void;
  /** Received messages: prefills the form with the sender and "Re : <subject>". */
  onReply: (message: Message) => void;
};

/** A message opened from the list or from a link (?message=<id>). Mount it only while open. */
export function MessageDialog({ message, now, onClose, onReply }: MessageDialogProps) {
  const received = message.direction === "recu";
  return (
    <Dialog
      open
      onClose={onClose}
      title={message.subject}
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose}>
            Fermer
          </Button>
          {received && (
            <Button size="lg" icon={<Reply className="size-5" aria-hidden />} onClick={() => onReply(message)}>
              Répondre
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
        <CorrespondentAvatar party={message.correspondent} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            <span className="font-medium text-ink-muted">{received ? "De" : "À"}</span> {message.correspondent.name}
          </p>
          <p className="text-sm text-ink-muted">
            {PARTY_LABEL[message.correspondent.kind]}
            <span aria-hidden> · </span>
            <span className="sr-only">, {received ? "reçu" : "envoyé"} </span>
            <time dateTime={message.sentAt}>{formatSentAt(message.sentAt, now)}</time>
          </p>
        </div>
      </div>
      <p className="mt-4 text-base leading-relaxed break-words whitespace-pre-line text-ink">{message.body}</p>
    </Dialog>
  );
}
