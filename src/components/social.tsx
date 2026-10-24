"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  GraduationCap,
  MapPin,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useApp } from "./store";
import { Button } from "./ui/button";
import { Badge, ErrorMessage, Loading, Modal, PageHeading } from "./shared";
import {
  acceptedConnection,
  canUseSchoolChat,
  connectionAllowed,
  sharedChatHub,
} from "@/lib/social";
import type { Operation } from "@/lib/actions";
import { useUrlState } from "./use-url-state";
import { useChatDraft } from "./use-chat-draft";
import { connectionInbox } from "@/lib/conversations";

function useSocialRefresh(enabled = true) {
  const { refresh, demo } = useApp();
  const [error, setError] = useState("");
  useEffect(() => {
    if (demo || !enabled) return;
    let active = true,
      running = false;
    const poll = async () => {
      if (!active || running || document.hidden) return;
      running = true;
      try {
        await refresh();
        if (active) setError("");
      } catch {
        if (active) setError("Updates paused. Reconnect or try refreshing.");
      } finally {
        running = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [demo, refresh, enabled]);
  return error;
}

export function ChatPanel({
  hubId = null,
  connectionId = null,
  title = "Common room",
  refreshEnabled = true,
}: {
  hubId?: string | null;
  connectionId?: string | null;
  title?: string;
  refreshEnabled?: boolean;
}) {
  const { state, mutate, demo } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const following = useRef(true);
  const threadRef = useRef("");
  const [newMessages, setNewMessages] = useState(false);
  const pollingError = useSocialRefresh(refreshEnabled);
  const allowed = hubId
    ? canUseSchoolChat(state, hubId)
    : !!connectionId && acceptedConnection(state, connectionId);
  const thread = hubId ? `hub:${hubId}` : `connection:${connectionId}`;
  const {
    body,
    update: setBody,
    clear,
    saved,
    ready,
  } = useChatDraft(state.profile.id, demo, thread, allowed);
  const messages = (state.messages ?? [])
    .filter(
      (m) =>
        !state.blocked.includes(m.senderId) &&
        (hubId ? m.hubId === hubId : m.connectionId === connectionId),
    )
    .slice(-100);
  const lastId = messages.at(-1)?.id;
  const lastSender = messages.at(-1)?.senderId;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (
      threadRef.current !== thread ||
      following.current ||
      lastSender === state.profile.id
    ) {
      el.scrollTop = el.scrollHeight;
      following.current = true;
    } else {
      setNewMessages(true);
    }
    threadRef.current = thread;
  }, [lastId, lastSender, thread, state.profile.id]);
  function jumpToLatest() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    following.current = true;
    setNewMessages(false);
  }
  if (!allowed)
    return (
      <div className="chat-locked">
        <ShieldCheck size={30} />
        <h3>This conversation is for approved members.</h3>
        <p>
          {hubId
            ? "Your school or community must approve your membership before you can read and send messages."
            : "Private chats open between accepted adult connections."}
        </p>
      </div>
    );
  const moderator =
    hubId &&
    state.hubs.some(
      (h) => h.id === hubId && (h.admin || h.role === "organizer"),
    );
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await mutate("chatSend", { hubId, connectionId, body });
      clear();
      jumpToLatest();
      requestAnimationFrame(() => composerRef.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="chat-panel" aria-label={title}>
      <header className="chat-header">
        <span className="chat-header-icon">
          <MessageCircle size={23} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>
            {hubId
              ? "A shared space for questions, plans and everyday hellos."
              : "A conversation between you and your connection."}
          </p>
        </div>
        <Badge tone="green">{demo ? "Fictional demo" : "Account chat"}</Badge>
      </header>
      <div className="chat-boundary">
        <ShieldCheck size={14} />
        {hubId
          ? "Approved members only. Community moderators can remove messages."
          : "Only you and this connection can read this conversation."}
        {!demo && <span>Updates every 5 seconds</span>}
      </div>
      <div className="chat-history">
        <div
          ref={scrollRef}
          className="chat-messages"
          role="log"
          aria-label="Conversation messages"
          aria-live="polite"
          aria-relevant="additions text"
          onScroll={(e) => {
            const el = e.currentTarget;
            following.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 64;
            if (following.current) setNewMessages(false);
          }}
        >
          {messages.length ? (
            messages.map((m) => (
              <article
                key={m.id}
                className={`chat-message ${m.senderId === state.profile.id ? "from-you" : ""}`}
              >
                <span className="chat-avatar" aria-hidden="true">
                  {m.senderName.slice(0, 1)}
                </span>
                <div className="message-content">
                  <div className="message-meta">
                    <b>
                      {m.senderId === state.profile.id ? "You" : m.senderName}
                    </b>
                    <time dateTime={m.createdAt}>
                      {new Intl.DateTimeFormat("en-MY", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Asia/Kuala_Lumpur",
                      }).format(new Date(m.createdAt))}
                    </time>
                    {!m.removed &&
                      (m.senderId === state.profile.id || moderator) && (
                        <button
                          className="icon-button"
                          aria-label={`Remove message from ${m.senderId === state.profile.id ? "you" : m.senderName}`}
                          onClick={() => setRemove(m.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                  </div>
                  <p className={m.removed ? "message-removed" : ""}>
                    {m.removed ? "This message was removed." : m.body}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="chat-first-message">
              <MessageCircle size={38} />
              <h3>Someone has to say the first hello.</h3>
              <p>
                Ask a question, share a study plan, or see who’s up for a game.
              </p>
            </div>
          )}
        </div>
        {newMessages && (
          <button
            type="button"
            className="chat-new-messages"
            onClick={jumpToLatest}
          >
            <ArrowDown size={14} />
            New messages · Jump to latest
          </button>
        )}
      </div>
      <div className="chat-composer-area">
        <ErrorMessage message={error || pollingError} />
        <form onSubmit={send} className="chat-composer">
          <label
            className="sr-only"
            htmlFor={`message-${hubId ?? connectionId}`}
          >
            Your message
          </label>
          <textarea
            ref={composerRef}
            id={`message-${hubId ?? connectionId}`}
            maxLength={1500}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              hubId ? "Say hello to your community…" : "Write a message…"
            }
            rows={2}
            disabled={busy || !ready}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={busy || !ready || !body.trim()}
            aria-label="Send message"
          >
            <Send size={18} />
            <span>{busy ? "Sending…" : "Send"}</span>
          </Button>
        </form>
        <small>
          Enter to send · Shift+Enter for a new line · {body.length}/1500
        </small>
        {!!body && (
          <div className="chat-draft-status">
            <span>
              {saved
                ? "Draft saved in this tab for up to 24 hours."
                : "Draft saving is unavailable in this tab."}
            </span>
            <button type="button" onClick={clear} disabled={busy}>
              Discard draft
            </button>
          </div>
        )}
      </div>
      <Modal
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Remove this message?"
      >
        <p>The conversation will show that a message was removed.</p>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            if (!remove) return;
            setBusy(true);
            try {
              await mutate("chatDelete", { id: remove });
              setRemove(null);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Unable to remove message.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Remove message
        </Button>
      </Modal>
    </section>
  );
}

export function SchoolsPage() {
  const { state, loading, mutate, notify } = useApp();
  const { params, update } = useUrlState();
  const query = params.get("q") ?? "";
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const pollingError = useSocialRefresh();
  if (loading) return <Loading />;
  const schools = (state.schoolDirectory ?? []).filter((s) =>
    `${s.name} ${s.city}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="Your school. Your people."
        title="Find your school community"
        description="Choose your school, explore its activities and join the conversation once your membership is approved."
      >
        {state.profile.age === "adult" && (
          <Button asChild variant="secondary">
            <Link href="/hubs?new=school">
              <GraduationCap size={17} />
              Start a school community
            </Link>
          </Button>
        )}
      </PageHeading>
      <div className="school-explainer">
        <span>
          <GraduationCap size={31} />
        </span>
        <div>
          <h2>One school. A shared common room.</h2>
          <p>
            Study groups, games and conversations live together. Choosing a
            school requests membership; its organizer approves access to the
            private group.
          </p>
        </div>
      </div>
      <label className="school-search">
        <Search size={19} />
        <input
          aria-label="Search school communities"
          placeholder="School, university or city…"
          value={query}
          onChange={(e) => update({ q: e.target.value.slice(0, 120) })}
        />
      </label>
      <ErrorMessage message={error || pollingError} />
      <div className="school-grid">
        {schools.map((s) => {
          const joined = state.joined.includes(s.id);
          const pending = state.memberships?.some(
            (m) => m.hubId === s.id && m.status === "pending",
          );
          return (
            <article
              className={`school-card ${state.profile.schoolHubId === s.id ? "your-school" : ""}`}
              key={s.id}
            >
              <div className="school-card-icon">
                <GraduationCap size={28} />
              </div>
              <div className="school-card-heading">
                <span className="eyebrow">
                  {s.kind === "university"
                    ? "University community"
                    : "School community"}
                </span>
                <h2>{s.name}</h2>
                <p>
                  <MapPin size={14} />
                  {s.city}
                </p>
              </div>
              {state.profile.schoolHubId === s.id && (
                <Badge tone="green">Your school</Badge>
              )}
              <p className="school-card-description">
                Your activities, school friends and shared chat, all in one
                place.
              </p>
              <div className="school-card-actions">
                <Button
                  variant={joined ? "outline" : "secondary"}
                  disabled={
                    !!busy || (pending && state.profile.schoolHubId === s.id)
                  }
                  onClick={async () => {
                    setBusy(s.id);
                    setError("");
                    try {
                      await mutate("selectSchool", { id: s.id });
                      notify(
                        joined
                          ? "Your school is saved to your profile."
                          : "School selected. Your membership request is waiting for an organizer’s approval.",
                      );
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Could not choose this school.",
                      );
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === s.id
                    ? "Saving…"
                    : pending && state.profile.schoolHubId === s.id
                      ? "Approval pending"
                      : joined
                        ? "Set as my school"
                        : "Choose my school"}
                  {joined ? <Check size={15} /> : <UserPlus size={15} />}
                </Button>
                {joined && (
                  <Link href={`/hubs/${s.id}?tab=chat`} className="text-link">
                    Open school chat <MessageCircle size={16} />
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!schools.length && (
        <div className="plans-empty">
          <GraduationCap size={38} />
          <h3>
            {query
              ? "No school matches that search."
              : "Your school’s next chapter could start here."}
          </h3>
          <p>
            {query
              ? "Try its full name or search by city."
              : "Ask an organizer to create the school community, or start one and complete community approval. New schools are never marked approved automatically."}
          </p>
          {state.profile.age === "adult" && (
            <Link href="/hubs?new=school" className="text-link">
              Set up a school community <ArrowRight size={15} />
            </Link>
          )}
        </div>
      )}
      <div className="school-access-note">
        <ShieldCheck size={19} />
        <p>
          School selection records your chosen community. It does not verify
          your enrollment or bypass membership approval. You can also join other
          clubs and communities.
        </p>
      </div>
    </>
  );
}

export function ConnectionsPage() {
  const { state, loading, mutate } = useApp();
  const { params, update } = useUrlState();
  const tab =
    params.get("view") === "requests"
      ? "requests"
      : params.get("view") === "discover"
        ? "discover"
        : "friends";
  const query = params.get("q") ?? "";
  const setTab = (view: "friends" | "requests" | "discover") =>
    update({ view: view === "friends" ? null : view, q: null }, "push");
  const setQuery = (q: string) => update({ q: q.slice(0, 120) });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const conversation = params.get("chat") ?? "";
  const conversationRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const setConversation = (id: string) =>
    update({ chat: id || null, view: null }, id ? "push" : "replace");
  const [removal, setRemoval] = useState<{
    op: Operation;
    id: string;
    name: string;
  } | null>(null);
  const pollingError = useSocialRefresh();
  useEffect(() => {
    if (
      conversation &&
      tab === "friends" &&
      !loading &&
      window.matchMedia("(max-width: 760px)").matches
    )
      conversationRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, [conversation, tab, loading]);
  if (loading) return <Loading />;
  const eligible = (state.connectionPeople ?? []).filter((p) =>
    connectionAllowed(state, p),
  );
  const ids = new Set(eligible.map((p) => p.id));
  const connections = (state.connections ?? []).filter((c) =>
    ids.has(c.requesterId === state.profile.id ? c.addresseeId : c.requesterId),
  );
  const friends = connections.filter((c) => c.status === "accepted");
  const inbox = connectionInbox(state, query);
  const incoming = connections.filter(
    (c) => c.status === "pending" && c.addresseeId === state.profile.id,
  );
  const outgoing = connections.filter(
    (c) => c.status === "pending" && c.requesterId === state.profile.id,
  );
  const requestedIds = new Set(
    connections.map((c) =>
      c.requesterId === state.profile.id ? c.addresseeId : c.requesterId,
    ),
  );
  const discoverable = eligible.filter(
    (p) =>
      !requestedIds.has(p.id) &&
      `${p.name} ${p.city} ${p.interests.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const selected = friends.find((c) => c.id === conversation);
  const selectedPerson = eligible.find(
    (p) =>
      p.id ===
      (selected?.requesterId === state.profile.id
        ? selected.addresseeId
        : selected?.requesterId),
  );
  async function act(
    op: Operation,
    id: string,
    extra: Record<string, unknown> = {},
  ) {
    setBusy(id);
    setError("");
    try {
      await mutate(op, { id, ...extra });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update connection.");
      return false;
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Good company starts with hello"
        title="Friends & connections"
        description="Find people through your communities, respond to requests and turn your next conversation into a shared plan."
      >
        <Button variant="secondary" onClick={() => setTab("discover")}>
          <UserPlus size={17} />
          Find people
        </Button>
      </PageHeading>
      <div className="connections-overview">
        <div>
          <Users size={23} />
          <b>{friends.length}</b>
          <span>{friends.length === 1 ? "connection" : "connections"}</span>
        </div>
        <div>
          <UserPlus size={23} />
          <b>{incoming.length}</b>
          <span>friend requests</span>
        </div>
        <p>
          {state.profile.age === "youth"
            ? "Connect with classmates in your approved school communities. Conversations stay in the moderated school group."
            : "Requests need a yes from both people. Private chats open after a connection is accepted."}
        </p>
      </div>
      <nav className="connections-tabs" aria-label="Connection views">
        {(["friends", "requests", "discover"] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === "friends"
              ? "My connections"
              : t === "requests"
                ? `Requests${incoming.length ? ` · ${incoming.length}` : ""}`
                : "Discover people"}
          </button>
        ))}
      </nav>
      <ErrorMessage message={error || pollingError} />
      {tab === "friends" && (
        <div className="connections-workspace">
          <aside
            ref={listRef}
            className="connections-list"
            aria-label="Your connections"
          >
            {!!friends.length && (
              <div className="connection-list-heading">
                <h2>
                  Your conversations <span>{friends.length}</span>
                </h2>
                <div className="connection-search">
                  <Search size={15} />
                  <input
                    aria-label="Search your connections"
                    placeholder="Find a friend…"
                    value={query}
                    maxLength={120}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {!!query && (
                    <button
                      type="button"
                      aria-label="Clear connection search"
                      onClick={() => setQuery("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
            {friends.length ? (
              inbox.length ? (
                inbox.map(({ connection: c, person, last, preview }) => {
                  return (
                    <div
                      className={`connection-row ${conversation === c.id ? "selected" : ""}`}
                      key={c.id}
                    >
                      <button
                        aria-label={`Open conversation with ${person.name}`}
                        aria-pressed={conversation === c.id}
                        onClick={() => setConversation(c.id)}
                      >
                        <span className="connection-avatar">
                          {person.name[0]}
                        </span>
                        <span>
                          <b>{person.name}</b>
                          <small>{person.city}</small>
                          <span className="connection-preview">{preview}</span>
                          {last && (
                            <time
                              className="connection-time"
                              dateTime={last.createdAt}
                            >
                              {new Intl.DateTimeFormat("en-MY", {
                                month: "short",
                                day: "numeric",
                                timeZone: "Asia/Kuala_Lumpur",
                              }).format(new Date(last.createdAt))}
                            </time>
                          )}
                        </span>
                        <MessageCircle size={18} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove connection with ${person.name}`}
                        onClick={() =>
                          setRemoval({
                            op: "disconnect",
                            id: c.id,
                            name: person.name,
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="connection-search-empty">
                  <p>No connections match “{query}”.</p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => setQuery("")}
                  >
                    Show all connections
                  </button>
                </div>
              )
            ) : (
              <div className="connection-empty">
                <Users size={35} />
                <h3>Your circle starts with one hello.</h3>
                <p>
                  Accept a request or find someone you’d like to connect with.
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    setTab(incoming.length ? "requests" : "discover")
                  }
                >
                  {incoming.length ? "View friend requests" : "Find people"}
                  <ArrowRight size={15} />
                </Button>
              </div>
            )}
          </aside>
          <div
            ref={conversationRef}
            className="connection-conversation"
            tabIndex={-1}
          >
            {selected && selectedPerson ? (
              state.profile.age === "adult" ? (
                <div>
                  <div className="connection-chat-controls">
                    <button
                      type="button"
                      className="conversation-back"
                      onClick={() => {
                        setConversation("");
                        listRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                    >
                      <ArrowLeft size={14} />
                      All connections
                    </button>
                    <span>Connected with {selectedPerson.name}</span>
                    <button
                      onClick={() =>
                        setRemoval({
                          op: "block",
                          id: selectedPerson.id,
                          name: selectedPerson.name,
                        })
                      }
                    >
                      Block person
                    </button>
                  </div>
                  <ChatPanel
                    key={selected.id}
                    connectionId={selected.id}
                    title={selectedPerson.name}
                    refreshEnabled={false}
                  />
                </div>
              ) : (
                <div className="chat-locked">
                  <GraduationCap size={32} />
                  <h3>Keep the conversation in your school common room.</h3>
                  <p>
                    Your school group is shared with approved classmates and
                    moderators.
                  </p>
                  <Button asChild variant="secondary">
                    <Link
                      href={`/hubs/${encodeURIComponent(sharedChatHub(state, selectedPerson)!)}?tab=chat`}
                    >
                      Open school chat
                      <MessageCircle size={17} />
                    </Link>
                  </Button>
                </div>
              )
            ) : (
              <div className="conversation-placeholder">
                <MessageCircle size={43} />
                <h2>A conversation starts here.</h2>
                <p>
                  {friends.length
                    ? "Choose a connection to open your conversation."
                    : "Your conversations will feel right at home here."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {tab === "requests" && (
        <div className="friend-requests">
          <h2>Friend requests</h2>
          {incoming.length ? (
            incoming.map((c) => {
              const p = eligible.find((p) => p.id === c.requesterId)!;
              return (
                <article className="friend-request" key={c.id}>
                  <span className="connection-avatar">{p.name[0]}</span>
                  <div>
                    <h3>{p.name}</h3>
                    <p>
                      {p.city} ·{" "}
                      {p.sharedHubIds.length
                        ? "A shared community"
                        : "Shared interests"}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={!!busy}
                    onClick={() =>
                      void act("connectionRespond", c.id, { accept: true })
                    }
                  >
                    Accept <Check size={15} />
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={() =>
                      void act("connectionRespond", c.id, { accept: false })
                    }
                  >
                    Decline
                  </Button>
                </article>
              );
            })
          ) : (
            <div className="connection-empty">
              <CheckCheck size={32} />
              <h3>You’re all caught up.</h3>
              <p>New friend requests will appear here.</p>
            </div>
          )}
          {outgoing.length > 0 && (
            <>
              <h2 className="spaced-top">Requests you’ve sent</h2>
              {outgoing.map((c) => {
                const p = eligible.find((p) => p.id === c.addresseeId)!;
                return (
                  <article className="friend-request" key={c.id}>
                    <span className="connection-avatar">{p.name[0]}</span>
                    <div>
                      <h3>{p.name}</h3>
                      <p>Waiting for a response</p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => void act("disconnect", c.id)}
                    >
                      Cancel request
                    </Button>
                  </article>
                );
              })}
            </>
          )}
        </div>
      )}
      {tab === "discover" && (
        <>
          <label className="school-search">
            <Search size={18} />
            <input
              aria-label="Search people to connect with"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, interest or city…"
            />
          </label>
          <div className="people-grid">
            {discoverable.map((p) => (
              <article className="person-card" key={p.id}>
                <span className="connection-avatar">{p.name[0]}</span>
                <h2>{p.name}</h2>
                <p>
                  <MapPin size={13} />
                  {p.city}
                </p>
                <div className="person-interests">
                  {p.interests.slice(0, 3).map((i) => (
                    <span key={i}>{i}</span>
                  ))}
                </div>
                <small>
                  {p.sharedHubIds.length
                    ? `${p.sharedHubIds.length} shared ${p.sharedHubIds.length === 1 ? "community" : "communities"}`
                    : "Open to connections"}
                </small>
                <Button
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() => void act("connect", p.id)}
                >
                  {busy === p.id ? "Sending…" : "Send friend request"}
                  <UserPlus size={15} />
                </Button>
              </article>
            ))}
          </div>
          {!discoverable.length && (
            <div className="connection-empty">
              <Users size={35} />
              <h3>
                {query
                  ? "No one matches that search."
                  : "More connections grow through your communities."}
              </h3>
              <p>
                Join a school or club, and opt into its member directory. New
                people who are open to connecting appear here.
              </p>
              <Link href="/hubs" className="text-link">
                Find a community
                <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </>
      )}
      <Modal
        open={!!removal}
        onClose={() => setRemoval(null)}
        title={`${removal?.op === "block" ? "Block" : "Remove"} ${removal?.name ?? "this connection"}?`}
      >
        <p>
          {removal?.op === "block"
            ? "This person will disappear from your connections and discovery. Private messages will close for both of you. You can manage blocks in Settings."
            : "This closes your private chat. It won’t cancel any activities you already share."}
        </p>
        <Button
          variant="secondary"
          disabled={!!busy}
          onClick={async () => {
            if (removal) {
              if (await act(removal.op, removal.id)) {
                setRemoval(null);
                setConversation("");
              }
            }
          }}
        >
          {removal?.op === "block" ? "Block person" : "Remove connection"}
        </Button>
      </Modal>
    </>
  );
}
