import { demoState } from "./fixtures";
import { canConfirm, overlaps, unlock, unlockPortfolio } from "./engine";
import { profileSchema, sparkSchema, nearbySchema } from "./validation";
import type { AppState, Candidate, Spark } from "./types";
import { communityAction, syncCommunities } from "./community-actions";
import { applySocial, isSocialOperation, type SocialOperation } from "./social";
export type Operation =
  | SocialOperation
  | "communityManage"
  | "publishSpark"
  | "profile"
  | "nearby"
  | "createSpark"
  | "updateSpark"
  | "deleteSpark"
  | "unlock"
  | "portfolio"
  | "send"
  | "respond"
  | "confirm"
  | "complete"
  | "cancel"
  | "attendance"
  | "withdraw"
  | "join"
  | "createHub"
  | "redeem"
  | "approve"
  | "approveParticipation"
  | "approveHub"
  | "approveTutor"
  | "approveOffer"
  | "offer"
  | "removeOffer"
  | "report"
  | "resolveReport"
  | "block"
  | "save"
  | "readNotifications"
  | "reset";
export function applyDemo(
  state: AppState,
  op: Operation,
  p: Record<string, unknown> = {},
): AppState {
  const s = structuredClone(state);
  if (isSocialOperation(op)) return applySocial(s, op, p);
  if (communityAction(s, op, p)) return s;
  const id = String(p.id ?? "");
  const spark = s.sparks.find((x) => x.id === id);
  const proposal = s.proposals.find((x) => x.sparkId === id);
  const withConflicts = (activity: Spark) => ({
    ...activity,
    conflicts: s.sparks
      .filter(
        (other) =>
          other.id !== activity.id &&
          ["CONFIRMED", "COMPLETED"].includes(other.status) &&
          other.participantIds.some((userId) =>
            activity.participantIds.includes(userId),
          ),
      )
      .flatMap((other) => other.windows),
  });
  if (op === "reset") return demoState();
  if (op === "nearby") {
    if (s.profile.age !== "adult")
      throw new Error(
        "Nearby people discovery is available to adult accounts.",
      );
    s.nearbySettings = nearbySchema.parse(p);
  }
  if (op === "profile") {
    s.profile = { ...s.profile, ...profileSchema.parse(p), onboarded: true };
    if (s.profile.schoolHubId)
      applySocial(s, "selectSchool", { id: s.profile.schoolHubId });
  }
  if (op === "createSpark" || op === "updateSpark") {
    const data = sparkSchema.parse(p);
    if (
      s.profile.age === "youth" &&
      (!data.hubId ||
        !s.hubs.some(
          (h) =>
            h.id === data.hubId && h.youthApproved && s.joined.includes(h.id),
        ))
    )
      throw new Error(
        "Under-18 accounts can create Sparks only in their approved school hubs.",
      );
    if (op === "updateSpark") {
      if (!spark || spark.ownerId !== s.profile.id)
        throw new Error("Only the organizer can edit this Spark.");
      if (["CONFIRMED", "COMPLETED"].includes(spark.status))
        throw new Error(
          "Confirmed sessions cannot be edited. Cancel and create a replacement.",
        );
      Object.assign(spark, data, { status: data.draft ? "DRAFT" : "BLOCKED" });
      s.proposals = s.proposals.filter((x) => x.sparkId !== id);
    } else
      s.sparks.unshift({
        ...data,
        id: crypto.randomUUID(),
        ownerId: s.profile.id,
        status: data.draft ? "DRAFT" : "BLOCKED",
        participantIds: [s.profile.id],
        createdAt: new Date().toISOString(),
      });
  }
  if (op === "deleteSpark") {
    if (!spark || spark.ownerId !== s.profile.id)
      throw new Error("Only the organizer can delete this Spark.");
    if (["CONFIRMED", "COMPLETED"].includes(spark.status))
      throw new Error("Cancel a confirmed session before deleting it.");
    s.sparks = s.sparks.filter((x) => x.id !== id);
    s.proposals = s.proposals.filter((x) => x.sparkId !== id);
  }
  if (op === "unlock") {
    if (!spark) throw new Error("Spark not found.");
    if (["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(spark.status))
      throw new Error("This activity is no longer open for matching.");
    const result = unlock(
      withConflicts(spark),
      s.candidates.filter(
        (c) =>
          !s.declines?.some((d) => d.sparkId === id && d.candidateId === c.id),
      ),
      s.blocked,
    );
    s.proposals = [...s.proposals.filter((x) => x.sparkId !== id), result];
    spark.status = result.feasible ? "PROPOSED" : "BLOCKED";
  }
  if (op === "portfolio") {
    const result = unlockPortfolio(
      s.sparks.map(withConflicts),
      s.candidates,
      s.blocked,
      s.declines,
    );
    for (const resultProposal of result.proposals) {
      s.proposals = [
        ...s.proposals.filter((x) => x.sparkId !== resultProposal.sparkId),
        resultProposal,
      ];
      const item = s.sparks.find((x) => x.id === resultProposal.sparkId);
      if (item) item.status = "PROPOSED";
    }
  }
  if (op === "send") {
    if (!spark || !proposal?.feasible)
      throw new Error("Run UNLOCK to find a feasible proposal first.");
    spark.status = "AWAITING_CONFIRMATION";
    s.notifications.unshift({
      id: crypto.randomUUID(),
      text: `Invitations prepared for ${spark.title}. In this demo, you can simulate each person's response.`,
      href: `/groups/${id}`,
      read: false,
    });
  }
  if (op === "respond") {
    if (!spark || !proposal || spark.status !== "AWAITING_CONFIRMATION")
      throw new Error("Send the proposal before collecting responses.");
    const action = proposal.actions.find((a) => a.id === p.actionId);
    if (!action) throw new Error("Invitation not found.");
    action.state = p.accept === true ? "accepted" : "declined";
    if (!p.accept) {
      s.declines = [
        ...(s.declines ?? []),
        { sparkId: id, candidateId: action.candidateId },
      ];
      spark.status = "BLOCKED";
      proposal.feasible = false;
      proposal.remainingBlockers.push(
        `${action.label} declined; find a replacement.`,
      );
    }
  }
  if (op === "confirm") {
    if (!spark || !proposal || !canConfirm(proposal))
      throw new Error(
        "Every participant and resource owner must explicitly accept first.",
      );
    if (
      withConflicts(spark).conflicts.some((w) => overlaps(w, proposal.window!))
    )
      throw new Error(
        "An existing participant has a conflicting confirmed session. Run UNLOCK again.",
      );
    for (const action of proposal.actions) {
      const c = s.candidates.find((c) => c.id === action.candidateId);
      if (!c || c.reservations.some((w) => overlaps(w, proposal.window!)))
        throw new Error("An offer is no longer available. Run UNLOCK again.");
    }
    spark.status = "CONFIRMED";
    spark.windows = [proposal.window!];
    for (const action of proposal.actions) {
      const c = s.candidates.find((c) => c.id === action.candidateId)!;
      c.reservations.push(proposal.window!);
      c.commitments++;
      if (
        ["participant", "tutor", "facilitator"].includes(action.kind) &&
        !spark.participantIds.includes(action.ownerId)
      )
        spark.participantIds.push(action.ownerId);
    }
  }
  if (op === "complete") {
    if (!spark || spark.status !== "CONFIRMED")
      throw new Error("Only confirmed sessions can be completed.");
    spark.status = "COMPLETED";
  }
  if (op === "cancel") {
    if (!spark) throw new Error("Session not found.");
    spark.status = "CANCELLED";
    if (proposal?.window)
      for (const action of proposal.actions) {
        const c = s.candidates.find((x) => x.id === action.candidateId);
        if (c)
          c.reservations = c.reservations.filter(
            (w) =>
              w.start !== proposal.window!.start ||
              w.end !== proposal.window!.end,
          );
      }
  }
  if (op === "withdraw") {
    if (!spark || spark.status !== "CONFIRMED")
      throw new Error("A confirmed session is required.");
    const userId = typeof p.userId === "string" ? p.userId : s.profile.id;
    if (!spark.participantIds.includes(userId))
      throw new Error("That person is not participating.");
    spark.participantIds = spark.participantIds.filter((u) => u !== userId);
    spark.status = "BLOCKED";
    if (proposal) {
      proposal.feasible = false;
      proposal.remainingBlockers = [
        "A participant cancelled. Find a replacement.",
      ];
      for (const a of proposal.actions) {
        const c = s.candidates.find((c) => c.id === a.candidateId);
        if (c && proposal.window)
          c.reservations = c.reservations.filter(
            (w) =>
              w.start !== proposal.window!.start ||
              w.end !== proposal.window!.end,
          );
        if (a.ownerId === userId) {
          a.state = "declined";
          s.declines = [
            ...(s.declines ?? []),
            { sparkId: id, candidateId: a.candidateId },
          ];
        }
      }
    }
  }
  if (op === "attendance") {
    if (
      !spark ||
      !["CONFIRMED", "COMPLETED"].includes(spark.status) ||
      !spark.participantIds.includes(s.profile.id)
    )
      throw new Error(
        "Attendance requires a confirmed session you participate in.",
      );
    s.attendance = [
      ...(s.attendance ?? []).filter(
        (a) => !(a.sparkId === id && a.userId === s.profile.id),
      ),
      { sparkId: id, userId: s.profile.id },
    ];
    s.notifications.unshift({
      id: crypto.randomUUID(),
      text: `Your attendance is recorded for ${spark.title}.`,
      read: false,
    });
  }
  if (op === "save") {
    s.saved = s.saved.includes(id)
      ? s.saved.filter((x) => x !== id)
      : [...s.saved, id];
  }
  if (op === "join") {
    const h = s.hubs.find((x) => x.id === id);
    if (h) {
      if (h.visibility === "private")
        throw new Error("Private hubs require an invitation code.");
      if (s.profile.age === "youth")
        throw new Error(
          "Under-18 accounts can only join approved private school hubs.",
        );
      h.pending = true;
    } else {
      if (!spark) throw new Error("Activity not found.");
      if (
        ["DRAFT", "CONFIRMED", "COMPLETED", "CANCELLED"].includes(spark.status)
      )
        throw new Error(
          "This activity is not accepting participation requests.",
        );
      if (spark.participantIds.includes(s.profile.id))
        throw new Error("You are already participating.");
      if (
        s.participationRequests?.some(
          (r) =>
            r.sparkId === id &&
            r.userId === s.profile.id &&
            r.status === "pending",
        )
      )
        throw new Error("Your request is already pending.");
      s.participationRequests = [
        ...(s.participationRequests ?? []),
        {
          id: crypto.randomUUID(),
          sparkId: id,
          userId: s.profile.id,
          status: "pending",
        },
      ];
      s.notifications.unshift({
        id: crypto.randomUUID(),
        text: `Participation requested for ${spark.title}. The organizer must approve your request.`,
        read: false,
      });
    }
  }
  if (op === "report") {
    if (String(p.reason ?? "").trim().length < 10)
      throw new Error("Please give at least 10 characters of detail.");
    s.reports.unshift({
      id: crypto.randomUUID(),
      sparkId: id,
      reason: String(p.reason).slice(0, 1000),
      reporterId: s.profile.id,
      status: "open",
      createdAt: new Date().toISOString(),
    });
  }
  if (op === "resolveReport") {
    const report = s.reports.find((r) => r.id === id);
    if (report) report.status = "resolved";
  }
  if (op === "block") {
    s.blocked = s.blocked.includes(id)
      ? s.blocked.filter((x) => x !== id)
      : [...s.blocked, id];
  }
  if (op === "readNotifications") {
    s.notifications.forEach((n) => (n.read = true));
  }
  if (op === "offer") {
    const offer = p as unknown as Pick<
      Candidate,
      | "label"
      | "kind"
      | "city"
      | "hubId"
      | "skills"
      | "quantity"
      | "capacity"
      | "cost"
      | "needs"
      | "windows"
    >;
    if (!offer.label || !Array.isArray(offer.windows) || !offer.windows.length)
      throw new Error("Give your offer a name and availability.");
    if (s.profile.age === "youth" && !offer.hubId)
      throw new Error("Youth offers stay inside approved school hubs.");
    s.candidates.push({
      ...offer,
      id: crypto.randomUUID(),
      ownerId: s.profile.id,
      age: s.profile.age,
      approved: offer.kind !== "tutor",
      optedIn: true,
      commitments: 0,
      reservations: [],
    });
  }
  if (op === "removeOffer") {
    const offer = s.candidates.find(
      (c) => c.id === id && c.ownerId === s.profile.id,
    );
    if (!offer) throw new Error("Only the offer owner can withdraw it.");
    if (offer.reservations.length)
      throw new Error(
        "Cancel the confirmed session before withdrawing a resource.",
      );
    offer.optedIn = false;
  }
  if (op === "approveTutor") {
    s.candidates
      .filter(
        (c) => c.hubId === id && c.ownerId === p.userId && c.kind === "tutor",
      )
      .forEach((c) => (c.approved = p.approved === true));
  }
  if (op === "approveOffer") {
    const c = s.candidates.find((c) => c.id === id);
    if (c) c.approved = true;
  }
  if (op === "approveHub") {
    const hub = s.hubs.find((h) => h.id === id);
    if (hub) {
      hub.approved = true;
      hub.youthApproved =
        p.youthApproved === true && hub.visibility === "private";
    }
  }
  if (op === "publishSpark") {
    if (!spark || spark.ownerId !== s.profile.id || spark.status !== "DRAFT")
      throw new Error("Only the organizer can publish their draft.");
    if (
      spark.hubId &&
      !s.hubs.some(
        (h) => h.id === spark.hubId && h.approved && s.joined.includes(h.id),
      )
    )
      throw new Error("Join an approved community before publishing.");
    spark.status = "BLOCKED";
  }
  return s.hubMembers ? syncCommunities(s) : s;
}
