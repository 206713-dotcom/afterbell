import type { AppState, HubMember, MemberRole } from "./types";
import { hubSchema } from "./validation";

export function syncCommunities(state: AppState) {
  const members = state.hubMembers ?? [];
  for (const m of members.filter((m) => m.userId === state.profile.id)) {
    Object.assign(m, {
      name: state.profile.name,
      age: state.profile.age,
      directoryVisible: !!state.profile.hubDirectoryVisible,
      interests: state.profile.interests,
      subjects: state.profile.subjects,
    });
  }
  state.joined = members
    .filter((m) => m.userId === state.profile.id && m.status === "approved")
    .map((m) => m.hubId);
  state.memberships = members
    .filter((m) => m.userId === state.profile.id)
    .flatMap((m) => {
      const h = state.hubs.find((h) => h.id === m.hubId);
      return h
        ? [
            {
              hubId: h.id,
              name: h.name,
              kind: h.kind ?? "community",
              visibility: h.visibility,
              role: m.role,
              status: m.status,
            },
          ]
        : [];
    });
  state.membershipRequests = members
    .filter((m) => m.status === "pending")
    .map((m) => ({ hubId: m.hubId, userId: m.userId, status: m.status }));
  for (const h of state.hubs) {
    const own = members.find(
      (m) => m.hubId === h.id && m.userId === state.profile.id,
    );
    h.members = members.filter(
      (m) => m.hubId === h.id && m.status === "approved",
    ).length;
    h.joined = own?.status === "approved";
    h.pending = own?.status === "pending";
    h.admin = own?.status === "approved" && own.role === "hub_admin";
    h.role = own?.status === "approved" ? own.role : undefined;
  }
  return state;
}

export function communityAction(
  s: AppState,
  op: string,
  p: Record<string, unknown>,
): boolean {
  const id = String(p.id ?? "");
  const h = s.hubs.find((h) => h.id === id);
  if (
    ![
      "createHub",
      "redeem",
      "communityManage",
      "approve",
      "approveParticipation",
    ].includes(op) &&
    !(op === "join" && h)
  )
    return false;
  s.hubMembers ??= [];
  const member = s.hubMembers.find(
    (m) =>
      m.hubId === id && m.userId === s.profile.id && m.status === "approved",
  );
  const manager = member && ["hub_admin", "organizer"].includes(member.role);
  function request(hubId: string) {
    const hub = s.hubs.find((x) => x.id === hubId);
    if (
      !hub ||
      !hub.approved ||
      (s.profile.age === "youth" &&
        (!hub.youthApproved || hub.visibility !== "private"))
    )
      throw new Error("This community is not available for your account.");
    const existing = s.hubMembers!.find(
      (m) => m.hubId === hubId && m.userId === s.profile.id,
    );
    if (existing?.status === "approved")
      throw new Error("You are already a member.");
    if (existing) existing.status = "pending";
    else
      s.hubMembers!.push({
        hubId,
        userId: s.profile.id,
        name: s.profile.name,
        role: "member",
        status: "pending",
        tutorApproved: false,
        directoryVisible: !!s.profile.hubDirectoryVisible,
        interests: s.profile.interests,
        subjects: s.profile.subjects,
        age: s.profile.age,
      });
  }
  if (op === "createHub") {
    if (s.profile.age !== "adult")
      throw new Error("An adult must create a community.");
    const data = hubSchema.parse(p),
      hubId = crypto.randomUUID();
    s.hubs.unshift({
      ...data,
      id: hubId,
      ownerId: s.profile.id,
      approved: false,
      youthApproved: false,
      members: 1,
    });
    s.hubMembers.push({
      hubId,
      userId: s.profile.id,
      name: s.profile.name,
      role: "hub_admin",
      status: "approved",
      tutorApproved: false,
      directoryVisible: !!s.profile.hubDirectoryVisible,
      interests: s.profile.interests,
      subjects: s.profile.subjects,
      age: s.profile.age,
    });
  } else if (op === "join" && h) {
    if (h.visibility !== "public")
      throw new Error("Use an invitation code for this private community.");
    request(h.id);
  } else if (op === "redeem") {
    const invite = s.hubInvites?.find(
      (i) =>
        i.code === String(p.code).trim().toUpperCase() &&
        !i.used &&
        Date.parse(i.expiresAt) > Date.now(),
    );
    if (!invite)
      throw new Error("That invitation has expired, was used, or is invalid.");
    request(invite.hubId);
    invite.used = true;
  } else if (op === "communityManage" || op === "approve") {
    if (!h || !manager)
      throw new Error(
        "Only community administrators and organizers can manage membership.",
      );
    const target = s.hubMembers.find(
      (m) => m.hubId === id && m.userId === p.userId,
    );
    if (!target) throw new Error("Member not found.");
    const action =
      op === "approve" ? (p.accept === false ? "reject" : "approve") : p.action;
    if (action === "approve" || action === "reject") {
      if (target.status !== "pending")
        throw new Error("This request has already been reviewed.");
      if (
        action === "approve" &&
        target.age === "youth" &&
        (!h.approved || !h.youthApproved || h.visibility !== "private")
      )
        throw new Error(
          "Students require an approved private school community.",
        );
      target.status = action === "approve" ? "approved" : "rejected";
    } else {
      if (member?.role !== "hub_admin")
        throw new Error(
          "Only an administrator can change roles or remove members.",
        );
      if (target.status !== "approved")
        throw new Error("Approve membership first.");
      if (action === "transfer") {
        if (h.ownerId !== s.profile.id || target.role !== "hub_admin")
          throw new Error(
            "The owner can transfer ownership to another administrator.",
          );
        h.ownerId = target.userId;
      } else if (action === "role" || action === "remove") {
        if (h.ownerId === target.userId)
          throw new Error(
            "Transfer ownership before removing or demoting the owner.",
          );
        const role = p.role as MemberRole;
        if (
          action === "role" &&
          !["hub_admin", "organizer", "member"].includes(role)
        )
          throw new Error("Choose a valid member role.");
        if (
          target.role === "hub_admin" &&
          (action === "remove" || role !== "hub_admin") &&
          s.hubMembers.filter(
            (m) =>
              m.hubId === id &&
              m.status === "approved" &&
              m.role === "hub_admin",
          ).length < 2
        )
          throw new Error("Keep at least one community administrator.");
        if (action === "remove") {
          if (
            s.sparks.some(
              (a) =>
                a.hubId === id &&
                a.status === "CONFIRMED" &&
                a.participantIds.includes(target.userId),
            ) ||
            s.candidates.some(
              (c) =>
                c.hubId === id &&
                c.ownerId === target.userId &&
                c.reservations.length,
            )
          )
            throw new Error(
              "Resolve this member’s confirmed commitments first.",
            );
          target.status = "rejected";
          target.tutorApproved = false;
          s.candidates
            .filter((c) => c.hubId === id && c.ownerId === target.userId)
            .forEach((c) => {
              c.optedIn = false;
            });
        } else target.role = role;
      } else throw new Error("Choose a valid community action.");
    }
  } else if (op === "approveParticipation") {
    const req = s.participationRequests?.find(
      (r) => r.id === id && r.status === "pending",
    );
    const spark = s.sparks.find((a) => a.id === req?.sparkId);
    if (!req || !spark || spark.ownerId !== s.profile.id)
      throw new Error("Only the organizer can review this request.");
    if (["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(spark.status))
      throw new Error("This activity is not open to new participants.");
    if (p.accept === true) {
      if (spark.participantIds.length >= spark.target)
        throw new Error("This activity is full.");
      if (
        spark.hubId &&
        !s.hubMembers.some(
          (m) =>
            m.hubId === spark.hubId &&
            m.userId === req.userId &&
            m.status === "approved",
        )
      )
        throw new Error("Approve community membership first.");
      spark.participantIds.push(req.userId);
      const gap = spark.requirements.find((r) => r.kind === "participant");
      if (gap) {
        gap.quantity--;
        spark.requirements = spark.requirements.filter((r) => r.quantity > 0);
      }
      spark.status = "BLOCKED";
      s.proposals = s.proposals.filter((r) => r.sparkId !== spark.id);
    }
    req.status = p.accept === true ? "approved" : "rejected";
  } else return false;
  syncCommunities(s);
  return true;
}

export function safeDirectory(s: AppState, id: string): HubMember[] {
  const h = s.hubs.find((h) => h.id === id);
  if (!s.joined.includes(id)) return [];
  const manager = h?.admin || h?.role === "organizer";
  return (s.hubMembers ?? [])
    .filter((m) => m.hubId === id && (m.status === "approved" || manager))
    .map((m) => ({
      ...m,
      name:
        m.directoryVisible || manager || m.userId === s.profile.id
          ? m.name
          : "Private member",
      interests:
        m.directoryVisible || m.userId === s.profile.id ? m.interests : [],
      subjects:
        m.directoryVisible || m.userId === s.profile.id ? m.subjects : [],
      age: undefined,
    }));
}
