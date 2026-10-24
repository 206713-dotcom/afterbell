import { z } from "zod";
import type { AppState, ConnectionPerson } from "./types";
import { syncCommunities } from "./community-actions";

export const socialOperations = [
  "selectSchool",
  "connect",
  "connectionRespond",
  "disconnect",
  "chatSend",
  "chatDelete",
] as const;
export type SocialOperation = (typeof socialOperations)[number];
export const isSocialOperation = (op: string): op is SocialOperation =>
  socialOperations.includes(op as SocialOperation);
const id = z.string().trim().min(1).max(80);
export function socialPayload(op: SocialOperation, value: unknown) {
  if (op === "chatSend")
    return z
      .object({
        hubId: id.nullable().default(null),
        connectionId: id.nullable().default(null),
        body: z.string().trim().min(1, "Write a message first.").max(1500),
      })
      .refine((p) => !!p.hubId !== !!p.connectionId, "Choose one conversation.")
      .parse(value);
  if (op === "connectionRespond")
    return z.object({ id, accept: z.boolean() }).parse(value);
  return z.object({ id }).parse(value);
}
export function canUseSchoolChat(s: AppState, hubId: string) {
  const hub = s.hubs.find((h) => h.id === hubId);
  return (
    !!hub?.approved &&
    s.joined.includes(hubId) &&
    (s.profile.age === "adult" ||
      (hub.visibility === "private" && hub.youthApproved))
  );
}
export function connectionAllowed(s: AppState, person: ConnectionPerson) {
  if (
    person.id === s.profile.id ||
    s.blocked.includes(person.id) ||
    person.age !== s.profile.age
  )
    return false;
  return (
    s.profile.age === "adult" ||
    person.sharedHubIds.some((h) => {
      const hub = s.hubs.find((x) => x.id === h);
      return (
        hub?.approved &&
        hub.youthApproved &&
        hub.visibility === "private" &&
        s.joined.includes(h)
      );
    })
  );
}
export function sharedChatHub(s: AppState, person: ConnectionPerson) {
  return person.sharedHubIds.find((id) => canUseSchoolChat(s, id));
}
export function acceptedConnection(s: AppState, connectionId: string) {
  if (s.profile.age !== "adult") return false;
  const c = s.connections?.find(
    (c) =>
      c.id === connectionId &&
      c.status === "accepted" &&
      [c.requesterId, c.addresseeId].includes(s.profile.id),
  );
  if (!c) return false;
  const otherId =
    c.requesterId === s.profile.id ? c.addresseeId : c.requesterId;
  const person = s.connectionPeople?.find((p) => p.id === otherId);
  return (
    !!person &&
    connectionAllowed(s, person) &&
    !s.blocked.includes(c.requesterId) &&
    !s.blocked.includes(c.addresseeId)
  );
}
export function incomingFriendRequests(s: AppState) {
  return (s.connections ?? []).filter(
    (c) =>
      c.status === "pending" &&
      c.addresseeId === s.profile.id &&
      s.connectionPeople?.some(
        (p) => p.id === c.requesterId && connectionAllowed(s, p),
      ),
  );
}
export function applySocial(
  s: AppState,
  op: SocialOperation,
  payload: Record<string, unknown>,
) {
  const p = socialPayload(op, payload) as Record<string, unknown>;
  const target = String(p.id ?? "");
  s.connections ??= [];
  s.messages ??= [];
  if (op === "selectSchool") {
    const hub = s.hubs.find(
      (h) =>
        h.id === target &&
        ["school", "university"].includes(h.kind ?? "") &&
        h.approved &&
        h.visibility === "private" &&
        (s.profile.age === "adult" || h.youthApproved),
    );
    if (!hub) throw new Error("Choose an approved school community.");
    s.profile.schoolHubId = hub.id;
    s.hubMembers ??= [];
    const member = s.hubMembers.find(
      (m) => m.hubId === target && m.userId === s.profile.id,
    );
    if (!member)
      s.hubMembers.push({
        hubId: target,
        userId: s.profile.id,
        name: s.profile.name,
        role: "member",
        status: "pending",
        tutorApproved: false,
        directoryVisible: !!s.profile.hubDirectoryVisible,
        age: s.profile.age,
        interests: s.profile.interests,
        subjects: s.profile.subjects,
      });
    else if (member.status === "rejected") member.status = "pending";
    syncCommunities(s);
  }
  if (op === "connect") {
    const person = s.connectionPeople?.find((x) => x.id === target);
    if (!person || !connectionAllowed(s, person))
      throw new Error("This person isn’t available to connect.");
    const previous = s.connections.find(
      (c) =>
        [c.requesterId, c.addresseeId].includes(target) &&
        [c.requesterId, c.addresseeId].includes(s.profile.id),
    );
    if (previous && previous.status !== "declined")
      throw new Error("A request or connection already exists.");
    if (previous)
      throw new Error(
        "This request was declined. You can’t send another request.",
      );
    if (
      s.connections.filter(
        (c) =>
          c.requesterId === s.profile.id &&
          Date.parse(c.createdAt) > Date.now() - 86400000,
      ).length >= 50
    )
      throw new Error("Too many friend requests today.");
    s.connections.push({
      id: crypto.randomUUID(),
      requesterId: s.profile.id,
      addresseeId: target,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }
  if (op === "connectionRespond") {
    const connection = s.connections.find(
      (c) =>
        c.id === target &&
        c.addresseeId === s.profile.id &&
        c.status === "pending",
    );
    const person = s.connectionPeople?.find(
      (x) => x.id === connection?.requesterId,
    );
    if (!connection || !person || !connectionAllowed(s, person))
      throw new Error("Only the recipient can answer this pending request.");
    connection.status = p.accept ? "accepted" : "declined";
  }
  if (op === "disconnect") {
    const connection = s.connections.find(
      (c) =>
        c.id === target &&
        [c.requesterId, c.addresseeId].includes(s.profile.id),
    );
    if (!connection) throw new Error("Connection unavailable.");
    // Keep a declined record so a removed request cannot be repeatedly sent.
    connection.status = "declined";
  }
  if (op === "chatSend") {
    const hubId = p.hubId as string | null,
      connectionId = p.connectionId as string | null;
    if (
      hubId
        ? !canUseSchoolChat(s, hubId)
        : !connectionId || !acceptedConnection(s, connectionId)
    )
      throw new Error(
        "Join the community or accept the connection before chatting.",
      );
    const now = Date.now();
    if (
      s.messages.filter(
        (m) =>
          m.senderId === s.profile.id && Date.parse(m.createdAt) > now - 10000,
      ).length >= 6
    )
      throw new Error(
        "Give the conversation a moment before sending more messages.",
      );
    s.messages.push({
      id: crypto.randomUUID(),
      hubId,
      connectionId,
      senderId: s.profile.id,
      senderName: s.profile.name,
      body: p.body as string,
      createdAt: new Date(now).toISOString(),
    });
  }
  if (op === "chatDelete") {
    const message = s.messages.find((m) => m.id === target);
    const moderator =
      message?.hubId &&
      s.hubs.some(
        (h) => h.id === message.hubId && (h.admin || h.role === "organizer"),
      );
    const readable =
      message &&
      (message.hubId
        ? canUseSchoolChat(s, message.hubId)
        : !!message.connectionId &&
          acceptedConnection(s, message.connectionId));
    if (
      !message ||
      !readable ||
      (message.senderId !== s.profile.id && !moderator)
    )
      throw new Error(
        "Only the sender or community moderator can remove this message.",
      );
    message.body = "";
    message.removed = true;
  }
  return s;
}

export function visibleSocial(s: AppState) {
  const connections = (s.connections ?? []).filter(
    (c) =>
      [c.requesterId, c.addresseeId].includes(s.profile.id) &&
      !s.blocked.includes(c.requesterId) &&
      !s.blocked.includes(c.addresseeId) &&
      s.connectionPeople?.some(
        (p) =>
          p.id ===
            (c.requesterId === s.profile.id ? c.addresseeId : c.requesterId) &&
          connectionAllowed(s, p),
      ),
  );
  const ids = new Set(
    connections
      .filter((c) => c.status === "accepted" && s.profile.age === "adult")
      .map((c) => c.id),
  );
  const messages = (s.messages ?? [])
    .filter(
      (m) =>
        !s.blocked.includes(m.senderId) &&
        (m.hubId
          ? canUseSchoolChat(s, m.hubId)
          : !!m.connectionId && ids.has(m.connectionId)),
    )
    .slice(-500);
  return { connections, messages };
}
