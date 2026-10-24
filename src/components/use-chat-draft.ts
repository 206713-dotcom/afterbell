"use client";
/* eslint-disable react-hooks/set-state-in-effect -- restore a tab-local draft after hydration, never in server HTML */
import { useEffect, useState } from "react";
import {
  chatDraftKey,
  draftStorage,
  readChatDraft,
  writeChatDraft,
} from "@/lib/chat-drafts";

export function useChatDraft(
  actor: string,
  demo: boolean,
  thread: string,
  allowed: boolean,
) {
  const key = chatDraftKey(actor, demo, thread);
  const [draft, setDraft] = useState({ key: "", body: "", available: false });
  useEffect(() => {
    const storage = draftStorage();
    if (!allowed) {
      writeChatDraft(storage, key, "");
      setDraft({ key, body: "", available: !!storage });
    } else setDraft({ key, ...readChatDraft(storage, key) });
  }, [key, allowed]);
  const update = (body: string) => {
    const text = body.slice(0, 1500);
    const available = writeChatDraft(draftStorage(), key, text);
    setDraft({ key, body: text, available });
  };
  return {
    body: allowed && draft.key === key ? draft.body : "",
    ready: draft.key === key,
    saved: draft.available,
    update,
    clear: () => update(""),
  };
}
