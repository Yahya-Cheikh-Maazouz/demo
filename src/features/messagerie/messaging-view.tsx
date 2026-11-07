"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import type { Mailbox, Message } from "@/lib/types";
import { INITIAL_SEND_STATE } from "./action-state";
import { markMessageReadAction, sendMessageAction } from "./actions";
import { ComposeForm, type Draft } from "./compose-form";
import {
  COMPOSE_CARD_CLASS,
  COMPOSE_ID,
  ComposeHeader,
  GRID_CLASS,
  LIST_CARD_CLASS,
  LIST_ID,
  MESSAGING_PATH,
} from "./layout";
import { MessageDialog } from "./message-dialog";
import { MessageList, viewHref, type MailboxView } from "./message-list";
import { replySubject } from "./wording";

const emptyDraft = (recipients: Mailbox["recipients"]): Draft => ({
  to: recipients[0]?.kind ?? "",
  subject: "",
  body: "",
});

/**
 * The mailbox (list + opened message) and the new-message form, which share state: "Répondre"
 * prefills the form, and a sent message shows up highlighted in "Envoyés".
 * URL: ?vue=envoyes selects the folder; ?message=<id> (links of the notification bell) opens a message.
 */
export function MessagingView({ mailbox }: { mailbox: Mailbox }) {
  const searchParams = useSearchParams();
  const urlView: MailboxView = searchParams.get("vue") === "envoyes" ? "envoyes" : "recus";
  const messageParam = searchParams.get("message");

  // Folder: switched at once on click (the URL follows through history.pushState, whose router
  // update is a transition), and synced back from the URL (Back/Forward, links).
  const [view, setView] = useState<MailboxView>(urlView);
  const [seenUrlView, setSeenUrlView] = useState(urlView);
  if (urlView !== seenUrlView) {
    setSeenUrlView(urlView);
    setView(urlView);
  }
  const selectView = (next: MailboxView) => {
    setView(next);
    // window.location, not urlView: the router may not have caught up with a previous click yet.
    const current = new URLSearchParams(window.location.search).get("vue") === "envoyes" ? "envoyes" : "recus";
    if (next !== current) window.history.pushState(null, "", viewHref(next));
  };

  // Opened message: clicked in the list, or named by the URL. A new ?message= (the bell links to
  // it while this page is open) opens that message; adjusting state while rendering avoids an effect.
  const [openId, setOpenId] = useState<string | null>(messageParam);
  const [seenParam, setSeenParam] = useState(messageParam);
  if (messageParam !== seenParam) {
    setSeenParam(messageParam);
    if (messageParam) setOpenId(messageParam);
  }
  const openMessage =
    (openId && (mailbox.received.find((m) => m.id === openId) ?? mailbox.sent.find((m) => m.id === openId))) || null;

  const closeMessage = useCallback(() => {
    setOpenId(null);
    // Drop ?message= so a reload, or the same bell link clicked again, opens it anew.
    const params = new URLSearchParams(window.location.search);
    if (!params.has("message")) return;
    params.delete("message");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${MESSAGING_PATH}?${query}` : MESSAGING_PATH);
  }, []);

  // Opening an unread message marks it read, once; the action refreshes the page and the badges.
  const unreadOpenId = openMessage?.direction === "recu" && !openMessage.readAt ? openMessage.id : null;
  const markRequested = useRef(new Set<string>());
  useEffect(() => {
    if (!unreadOpenId || markRequested.current.has(unreadOpenId)) return;
    const requested = markRequested.current;
    requested.add(unreadOpenId);
    startTransition(async () => {
      const result = await markMessageReadAction(unreadOpenId);
      // Allow a retry the next time it is opened.
      if (!result.ok) requested.delete(unreadOpenId);
    });
  }, [unreadOpenId]);

  // New message.
  const [sendState, sendAction] = useActionState(sendMessageAction, INITIAL_SEND_STATE);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(mailbox.recipients));
  const [handledState, setHandledState] = useState(sendState);
  if (sendState !== handledState) {
    setHandledState(sendState);
    if (sendState.status === "success") {
      setDraft(emptyDraft(mailbox.recipients));
      setView("envoyes");
    }
  }
  // The confirmation goes away as soon as the student starts another message.
  const [dismissedAttempt, setDismissedAttempt] = useState<number | undefined>(undefined);
  const showSuccess = sendState.status === "success" && dismissedAttempt !== sendState.attempt;
  const [focusRequest, setFocusRequest] = useState(0);

  const editDraft = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    if (sendState.status === "success") setDismissedAttempt(sendState.attempt);
  };

  const reply = (message: Message) => {
    editDraft({ to: message.correspondent.kind, subject: replySubject(message.subject) });
    setFocusRequest((n) => n + 1);
    closeMessage();
  };

  // After a send, "Envoyés" is shown (the new message on top): keep the URL in step.
  useEffect(() => {
    if (sendState.status === "success") window.history.replaceState(null, "", viewHref("envoyes"));
  }, [sendState]);

  return (
    <div className={GRID_CLASS}>
      <Card id={LIST_ID} className={LIST_CARD_CLASS}>
        <MessageList
          view={view}
          onViewChange={selectView}
          mailbox={mailbox}
          highlightId={sendState.status === "success" ? sendState.sentId : undefined}
          onOpen={setOpenId}
        />
      </Card>

      <Card id={COMPOSE_ID} className={COMPOSE_CARD_CLASS}>
        <ComposeHeader />
        <CardBody>
          <ComposeForm
            recipients={mailbox.recipients}
            draft={draft}
            onEdit={editDraft}
            state={sendState}
            action={sendAction}
            showSuccess={showSuccess}
            focusRequest={focusRequest}
          />
        </CardBody>
      </Card>

      {openMessage && (
        <MessageDialog message={openMessage} now={mailbox.now} onClose={closeMessage} onReply={reply} />
      )}
    </div>
  );
}
