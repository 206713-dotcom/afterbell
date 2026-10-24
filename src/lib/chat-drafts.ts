import type { AppState } from "./types";
import { acceptedConnection, canUseSchoolChat } from "./social";

const PREFIX = "afterbell-chat-draft:v1:";
const DAY = 86400000;
type DraftStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem" | "key" | "length"
>;
export function chatDraftKey(actor: string, demo: boolean, thread: string) {
  return `${PREFIX}${demo ? "demo" : "account"}:${encodeURIComponent(actor)}:${encodeURIComponent(thread)}`;
}
export function draftStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
export function readChatDraft(
  storage: DraftStorage | null,
  key: string,
  now = Date.now(),
) {
  if (!storage) return { body: "", available: false };
  try {
    const raw = storage.getItem(key);
    if (!raw) return { body: "", available: true };
    const value = JSON.parse(raw);
    if (
      typeof value.body !== "string" ||
      value.body.length > 1500 ||
      typeof value.savedAt !== "number" ||
      value.savedAt > now ||
      now - value.savedAt >= DAY
    ) {
      storage.removeItem(key);
      return { body: "", available: true };
    }
    return { body: value.body as string, available: true };
  } catch {
    try {
      storage.removeItem(key);
    } catch {}
    return { body: "", available: false };
  }
}
export function writeChatDraft(
  storage: DraftStorage | null,
  key: string,
  body: string,
  now = Date.now(),
) {
  if (!storage) return false;
  try {
    if (body)
      storage.setItem(
        key,
        JSON.stringify({ body: body.slice(0, 1500), savedAt: now }),
      );
    else storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
function keys(storage: DraftStorage) {
  return Array.from({ length: storage.length }, (_, i) =>
    storage.key(i),
  ).filter((k): k is string => !!k && k.startsWith(PREFIX));
}
export function clearChatDrafts(storage: DraftStorage | null = draftStorage()) {
  try {
    if (storage) for (const key of keys(storage)) storage.removeItem(key);
  } catch {}
}
/** Canonical account reads remove drafts for conversations the actor can no longer use. */
export function pruneChatDrafts(
  storage: DraftStorage | null,
  state: AppState,
  demo: boolean,
) {
  if (!storage || !state.profile.id) return;
  const actorPrefix = chatDraftKey(state.profile.id, demo, "");
  const allowed = new Set([
    ...state.hubs
      .filter((h) => canUseSchoolChat(state, h.id))
      .map((h) => chatDraftKey(state.profile.id, demo, `hub:${h.id}`)),
    ...(state.connections ?? [])
      .filter((c) => acceptedConnection(state, c.id))
      .map((c) => chatDraftKey(state.profile.id, demo, `connection:${c.id}`)),
  ]);
  try {
    for (const key of keys(storage)) {
      if (!key.startsWith(actorPrefix)) continue;
      if (!allowed.has(key)) storage.removeItem(key);
      else readChatDraft(storage, key);
    }
  } catch {}
}
