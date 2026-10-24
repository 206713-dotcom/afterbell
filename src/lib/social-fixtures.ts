import type { AppState } from "./types";
import { cityArea, areaById } from "./locations";

/** Only for the explicitly labelled, browser-local fictional demo. */
export function upgradeDemoSocial(s: AppState) {
  s.schoolDirectory = s.hubs
    .filter(
      (h) => ["school", "university"].includes(h.kind ?? "") && h.approved,
    )
    .map(({ id, name, city, kind }) => ({ id, name, city, kind: kind! }));
  s.connectionPeople = (s.nearbyPeople ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    city: areaById(p.areaId)?.city ?? cityArea(s.profile.city).city,
    age: "adult" as const,
    interests: p.interests,
    sharedHubIds: [],
  }));
  for (const member of s.hubMembers ?? []) {
    if (
      member.userId === s.profile.id ||
      !member.directoryVisible ||
      member.status !== "approved"
    )
      continue;
    const person = s.connectionPeople.find((p) => p.id === member.userId);
    if (person) person.sharedHubIds.push(member.hubId);
    else
      s.connectionPeople.push({
        id: member.userId,
        name: member.name,
        city: s.hubs.find((h) => h.id === member.hubId)?.city ?? s.profile.city,
        age: member.age ?? "adult",
        interests: member.interests,
        sharedHubIds: [member.hubId],
      });
  }
  if (!s.connections)
    s.connections = [
      {
        id: "demo-adam-friend",
        requesterId: "demo-you",
        addresseeId: "adam",
        status: "accepted",
        createdAt: "2026-10-20T02:00:00Z",
      },
      {
        id: "demo-hana-request",
        requesterId: "hana",
        addresseeId: "demo-you",
        status: "pending",
        createdAt: "2026-10-22T02:00:00Z",
      },
    ];
  if (!s.messages)
    s.messages = [
      {
        id: "demo-school-welcome",
        hubId: "school-hub",
        connectionId: null,
        senderId: "tutor-sam",
        senderName: "Sam",
        body: "Welcome to the school common room! Share a study plan, ask a question, or find someone to revise with.",
        createdAt: "2026-10-22T02:00:00Z",
      },
      {
        id: "demo-adam-hello",
        hubId: null,
        connectionId: "demo-adam-friend",
        senderId: "adam",
        senderName: "Adam",
        body: "Hey Alex! Up for a game this weekend? I can bring the spare racket.",
        createdAt: "2026-10-22T02:10:00Z",
      },
    ];
  return s;
}
