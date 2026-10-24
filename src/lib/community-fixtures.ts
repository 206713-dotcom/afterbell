import type { AppState, HubMember } from "./types";
import { syncCommunities } from "./community-actions";

/** Fictional schools for the explicitly labelled demo. Never used for account data. */
export function upgradeDemoCommunities(state: AppState) {
  if (state.demoVersion === 2) return state;
  state.demoVersion = 2;
  state.hubs.forEach((h) => {
    h.kind ??= h.youthApproved ? "school" : "club";
    h.ownerId ??= h.id === "school-hub" ? "demo-you" : "hub-admin";
  });
  state.hubs.push({
    id: "selasih-school",
    name: "Selasih School Community",
    description:
      "A fictional private school community. Our own projects, study circles, and approved members, all in one place.",
    city: "Petaling Jaya",
    category: "study",
    kind: "school",
    visibility: "private",
    approved: true,
    youthApproved: true,
    ownerId: "teacher-jo",
    members: 4,
  });
  state.hubs.push({
    id: "bayu-school",
    name: "Bayu School Community",
    description:
      "A separate fictional school community. Access requires an invitation and membership approval.",
    city: "Shah Alam",
    category: "study",
    kind: "school",
    visibility: "private",
    approved: true,
    youthApproved: true,
    ownerId: "teacher-bayu",
    members: 1,
  });
  const row = (
    hubId: string,
    userId: string,
    name: string,
    role: HubMember["role"] = "member",
    age: "adult" | "youth" = "adult",
  ): HubMember => ({
    hubId,
    userId,
    name,
    role,
    age,
    status: "approved",
    tutorApproved: userId === "tutor-sam",
    directoryVisible: age === "adult",
    interests: ["Study", "Community"],
    subjects: ["Maths"],
  });
  state.hubMembers = [
    row("school-hub", "demo-you", state.profile.name, "hub_admin"),
    row("school-hub", "hub-admin", "Ms. Aina", "hub_admin"),
    row("school-hub", "tutor-sam", "Sam", "organizer"),
    ...[1, 2, 3, 4, 5].map((n) =>
      row("school-hub", `youth-${n}`, `Student ${n}`, "member", "youth"),
    ),
    row("selasih-school", "demo-you", state.profile.name),
    row("selasih-school", "li-wei", "Li Wei", "member", "youth"),
    row("selasih-school", "sara-school", "Sara", "member", "youth"),
    row("selasih-school", "teacher-jo", "Teacher Jo", "hub_admin"),
    row("bayu-school", "teacher-bayu", "Teacher Bayu", "hub_admin"),
    ...state.candidates
      .filter(
        (c, i, all) =>
          c.hubId &&
          !["school-hub"].includes(c.hubId) &&
          all.findIndex(
            (x) => x.ownerId === c.ownerId && x.hubId === c.hubId,
          ) === i,
      )
      .map((c) => row(c.hubId!, c.ownerId, c.label.split(" ")[0])),
  ];
  for (const id of state.joined.filter((id) => id !== "school-hub"))
    if (
      !state.hubMembers.some(
        (m) => m.hubId === id && m.userId === state.profile.id,
      )
    )
      state.hubMembers.push(row(id, state.profile.id, state.profile.name));
  state.hubInvites = [
    {
      id: "bayu-invite",
      hubId: "bayu-school",
      code: "BAYU-DEMO",
      expiresAt: "2027-12-31T00:00:00Z",
      used: false,
    },
    {
      id: "meranti-invite",
      hubId: "school-hub",
      code: "MERANTI-DEMO",
      expiresAt: "2027-12-31T00:00:00Z",
      used: false,
    },
  ];
  if (!state.sparks.some((s) => s.id === "school-workshop")) {
    state.sparks.push({
      id: "school-workshop",
      title: "Build our first school workshop.",
      description:
        "A fictional school coding workshop for three learners and an approved facilitator. We need a suitable room and everyone’s consent before it can happen.",
      ownerId: state.profile.id,
      hubId: "selasih-school",
      category: "community",
      city: "Petaling Jaya",
      status: "DRAFT",
      target: 4,
      participantIds: ["demo-you", "li-wei", "sara-school"],
      windows: [
        {
          start: "2026-10-25T10:00:00+08:00",
          end: "2026-10-25T12:00:00+08:00",
        },
      ],
      requirements: [
        { id: "facilitator", kind: "facilitator", quantity: 1 },
        { id: "workshop-room", kind: "room", quantity: 1, capacity: 4 },
      ],
      budget: 0,
      skill: "All levels",
      subject: "Computer Science",
      academicLevel: "Lower secondary",
      learningGoals:
        "Build a first interactive project and share what we learned.",
      createdAt: "2026-10-22T01:00:00Z",
    });
    const base = {
      city: "Petaling Jaya",
      hubId: "selasih-school",
      ownerId: "teacher-jo",
      age: "adult" as const,
      optedIn: true,
      approved: true,
      skills: [],
      quantity: 1,
      capacity: 4,
      cost: 0,
      commitments: 0,
      needs: [],
      reservations: [],
      windows: [
        {
          start: "2026-10-25T10:00:00+08:00",
          end: "2026-10-25T12:00:00+08:00",
        },
      ],
    };
    state.candidates.push(
      {
        ...base,
        id: "teacher-jo-facilitator",
        label: "Teacher Jo · workshop facilitator",
        kind: "facilitator",
      },
      {
        ...base,
        id: "selasih-project-room",
        label: "Approved Selasih project room",
        kind: "room",
      },
    );
  }
  for (const hub of state.hubs.filter((h) => h.visibility === "public")) {
    const participants = new Set([
      ...state.sparks
        .filter((s) => !s.hubId && s.city === hub.city)
        .flatMap((s) => s.participantIds),
      ...state.candidates
        .filter((c) => !c.hubId && c.city === hub.city)
        .map((c) => c.ownerId),
    ]);
    for (const id of participants)
      if (
        id !== state.profile.id &&
        !state.hubMembers.some((m) => m.hubId === hub.id && m.userId === id)
      )
        state.hubMembers.push(
          row(
            hub.id,
            id,
            id.replaceAll("-", " ").replace(/^./, (s) => s.toUpperCase()),
          ),
        );
  }
  return syncCommunities(state);
}
