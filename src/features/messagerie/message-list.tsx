"use client";

import type { MouseEvent } from "react";
import { CheckCheck, Inbox, Send, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { Mailbox, Message } from "@/lib/types";
import { CorrespondentAvatar } from "./correspondent-avatar";
import { MESSAGING_PATH } from "./layout";
import { formatListDate, previewOf } from "./wording";

export type MailboxView = "recus" | "envoyes";

export const viewHref = (view: MailboxView) => (view === "envoyes" ? `${MESSAGING_PATH}?vue=envoyes` : MESSAGING_PATH);

type MessageListProps = {
  view: MailboxView;
  /** Plain click on a folder link; the parent switches it and updates the URL. */
  onViewChange: (view: MailboxView) => void;
  mailbox: Mailbox;
  /** Message just sent: highlighted at the top of "Envoyés". */
  highlightId?: string;
  onOpen: (messageId: string) => void;
};

/** "Reçus" / "Envoyés" switch and the matching messages, newest first. */
export function MessageList({ view, onViewChange, mailbox, highlightId, onOpen }: MessageListProps) {
  const messages = view === "recus" ? mailbox.received : mailbox.sent;
  const unread = mailbox.received.filter((m) => !m.readAt).length;

  return (
    <>
      <h2 className="sr-only">Mes messages</h2>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <FolderSwitch
          view={view}
          onChange={onViewChange}
          received={mailbox.received.length}
          sent={mailbox.sent.length}
          unread={unread}
        />
      </div>

      {messages.length === 0 ? (
        view === "recus" ? (
          <EmptyState
            icon={Inbox}
            title="Aucun message reçu"
            description="Les messages de votre moniteur et de votre auto-école apparaîtront ici."
          />
        ) : (
          <EmptyState icon={Send} title="Aucun message envoyé" description="Vos échanges apparaîtront ici." />
        )
      ) : (
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-b-3xl border-t border-line">
          {messages.map((message) => (
            <li key={message.id}>
              <MessageRow
                message={message}
                now={mailbox.now}
                highlighted={message.id === highlightId}
                onOpen={() => onOpen(message.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Segmented control made of two links: the folder lives in the URL (?vue=envoyes). A plain click
 * switches it in place (no server round trip); a modified click opens it in a new tab.
 */
function FolderSwitch({
  view,
  onChange,
  received,
  sent,
  unread,
}: {
  view: MailboxView;
  onChange: (view: MailboxView) => void;
  received: number;
  sent: number;
  unread: number;
}) {
  const items: Array<{ view: MailboxView; label: string; count: number; srCount: string; icon: LucideIcon }> = [
    {
      view: "recus",
      label: "Reçus",
      count: received,
      srCount: `${received > 1 ? "messages" : "message"}${unread > 0 ? `, dont ${unread} non ${unread > 1 ? "lus" : "lu"}` : ""}`,
      icon: Inbox,
    },
    { view: "envoyes", label: "Envoyés", count: sent, srCount: sent > 1 ? "messages" : "message", icon: Send },
  ];

  const select = (event: MouseEvent<HTMLAnchorElement>, next: MailboxView) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (next !== view) onChange(next);
  };

  return (
    <nav aria-label="Dossiers de la messagerie">
      <ul className="grid grid-cols-2 gap-1 rounded-2xl bg-line/60 p-1 sm:inline-grid sm:min-w-80">
        {items.map((item) => {
          const active = item.view === view;
          return (
            <li key={item.view}>
              <a
                href={viewHref(item.view)}
                onClick={(event) => select(event, item.view)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150",
                  active ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:bg-surface/60 hover:text-ink",
                )}
              >
                <item.icon className={cn("size-4", active ? "text-brand" : "text-ink-subtle")} aria-hidden />
                {item.label}
                <span
                  className={cn(
                    "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums",
                    active ? "bg-brand-soft text-brand" : "bg-surface/70 text-ink-subtle",
                  )}
                >
                  {item.count}
                  <span className="sr-only"> {item.srCount}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * One message. Unread ones stand out by weight, a dot and a "Non lu" label (never by color alone);
 * read ones carry a small "Lu" flag, as the client asked.
 */
function MessageRow({
  message,
  now,
  highlighted,
  onOpen,
}: {
  message: Message;
  now: string;
  highlighted: boolean;
  onOpen: () => void;
}) {
  const received = message.direction === "recu";
  const unread = received && !message.readAt;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={cn(
        "relative flex w-full items-start gap-3 px-5 py-4 text-left transition-colors focus-visible:-outline-offset-2 sm:px-6",
        // Lighter than the avatar's tint, with a brand edge, so the avatar stays visible.
        highlighted
          ? "bg-brand-soft/50 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-brand hover:bg-brand-soft/70"
          : "hover:bg-subtle",
      )}
    >
      <CorrespondentAvatar party={message.correspondent} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-[0.12em] text-ink-subtle uppercase">
            {received ? "De" : "À"}
            <span aria-hidden> ·</span> {message.correspondent.name}
          </span>
          <time
            dateTime={message.sentAt}
            className={cn("shrink-0 text-xs tabular-nums", unread ? "font-bold text-ink" : "text-ink-subtle")}
          >
            {formatListDate(message.sentAt, now)}
          </time>
        </span>
        <span className="mt-1 flex items-center gap-2">
          {unread && <span aria-hidden className="size-2 shrink-0 rounded-full bg-brand" />}
          <span className={cn("truncate text-ink", unread ? "font-bold" : "font-semibold")}>{message.subject}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-3">
          <span className={cn("min-w-0 flex-1 truncate text-sm", unread ? "text-ink" : "text-ink-muted")}>
            {previewOf(message.body)}
          </span>
          {received &&
            (unread ? (
              <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">
                Non lu
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-subtle">
                <CheckCheck className="size-3.5" aria-hidden />
                Lu
              </span>
            ))}
        </span>
      </span>
    </button>
  );
}
