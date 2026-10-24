import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { LocalAccounts } from "../src/lib/local-accounts";

let store: LocalAccounts, folder: string, a: string, b: string, youth: string;
const password = "a-strong-test-password";
const preference = {
  name: "Alex Tan",
  city: "Petaling Jaya",
  age: "adult",
  interests: ["Study", "Badminton"],
  subjects: ["Maths"],
  availability: ["Weekend mornings"],
  experience: "Intermediate",
  communityTypes: ["Private hubs"],
  discoverable: false,
  hubDirectoryVisible: false,
};
const activity = {
  title: "A proper school study circle",
  description: "Work through the revision questions together in our community.",
  category: "study",
  city: "Petaling Jaya",
  target: 2,
  skill: "Maths",
  budget: 0,
  subject: "Maths",
  academicLevel: "IGCSE",
  learningGoals: "Understand quadratic equations.",
  requirements: [{ id: "people", kind: "participant", quantity: 1 }],
  windows: [
    { start: "2026-11-01T09:00:00+08:00", end: "2026-11-01T11:00:00+08:00" },
  ],
};
beforeEach(async () => {
  folder = mkdtempSync(path.join(tmpdir(), "afterbell-account-test-"));
  store = new LocalAccounts(path.join(folder, "test.sqlite"));
  a = store.identity(
    (await store.register({ email: "alex@example.com", password })).token,
  )!;
  b = store.identity(
    (await store.register({ email: "blair@example.com", password })).token,
  )!;
  youth = store.identity(
    (await store.register({ email: "cai@example.com", password })).token,
  )!;
  store.mutate(a, "profile", preference);
  store.mutate(b, "profile", { ...preference, name: "Blair Lim" });
  store.mutate(youth, "profile", { ...preference, name: "Cai", age: "youth" });
});
afterEach(() => {
  store.close();
  for (const file of readdirSync(folder)) rmSync(path.join(folder, file));
  rmdirSync(folder);
});
function school() {
  store.mutate(a, "createHub", {
    name: "Meranti School",
    description: "An actual private school community for these account tests.",
    city: "Petaling Jaya",
    category: "study",
    kind: "school",
    visibility: "private",
  });
  const id = store.read(a).hubs[0].id;
  store.mutate(a, "approveHub", { id, youthApproved: true });
  return id;
}
function enroll(userId: string, hubId: string) {
  store.mutate(userId, "redeem", store.invite(a, hubId));
  store.mutate(a, "communityManage", { id: hubId, action: "approve", userId });
}
describe("persistent individual accounts", () => {
  it("requires mutual consent for persistent chats and rejects sender impersonation", () => {
    store.mutate(b, "profile", {
      ...preference,
      name: "Blair Lim",
      discoverable: true,
    });
    store.mutate(a, "connect", { id: b, requesterId: youth });
    const connection = store.read(b).connections![0];
    expect(connection.requesterId).toBe(a);
    expect(() =>
      store.mutate(a, "chatSend", {
        connectionId: connection.id,
        body: "Too early",
      }),
    ).toThrow();
    expect(() =>
      store.mutate(a, "connectionRespond", { id: connection.id, accept: true }),
    ).toThrow(/recipient/);
    store.mutate(b, "connectionRespond", { id: connection.id, accept: true });
    store.mutate(a, "chatSend", {
      connectionId: connection.id,
      body: "Meet for revision?",
      senderId: b,
    });
    const message = store.read(b).messages![0];
    expect(message.senderId).toBe(a);
    expect(message.body).toBe("Meet for revision?");
    expect(store.read(youth).messages).toEqual([]);
    expect(() => store.mutate(b, "chatDelete", { id: message.id })).toThrow(
      /sender/,
    );
    store.close();
    store = new LocalAccounts(path.join(folder, "test.sqlite"));
    expect(store.read(b).messages![0].body).toBe("Meet for revision?");
    store.mutate(a, "chatDelete", { id: message.id });
    expect(store.read(b).messages![0]).toMatchObject({
      body: "",
      removed: true,
    });
    store.mutate(b, "disconnect", { id: connection.id });
    expect(() =>
      store.mutate(a, "chatSend", {
        connectionId: connection.id,
        body: "Closed",
      }),
    ).toThrow();
    expect(store.read(a).messages).toEqual([]);
  });
  it("hides blocked friends and messages in both directions", () => {
    store.mutate(b, "profile", {
      ...preference,
      name: "Blair Lim",
      discoverable: true,
    });
    store.mutate(a, "connect", { id: b });
    const id = store.read(b).connections![0].id;
    store.mutate(b, "connectionRespond", { id, accept: true });
    store.mutate(a, "chatSend", { connectionId: id, body: "A shared chat" });
    store.mutate(b, "block", { id: a });
    for (const user of [a, b]) {
      expect(store.read(user).messages).toEqual([]);
      expect(store.read(user).connectionPeople).toEqual([]);
      expect(() =>
        store.mutate(user, "chatSend", { connectionId: id, body: "Blocked" }),
      ).toThrow();
    }
  });
  it("records school choice as pending and revokes school chat when membership ends", () => {
    const id = school();
    expect(store.read(b).schoolDirectory![0].id).toBe(id);
    store.mutate(a, "chatSend", { hubId: id, body: "Welcome to school!" });
    store.mutate(b, "selectSchool", { id });
    expect(store.read(b).profile.schoolHubId).toBe(id);
    expect(store.read(b).memberships![0].status).toBe("pending");
    expect(store.read(b).messages).toEqual([]);
    expect(() =>
      store.mutate(b, "chatSend", { hubId: id, body: "Not yet approved" }),
    ).toThrow();
    store.mutate(a, "communityManage", { id, action: "approve", userId: b });
    store.mutate(b, "chatSend", { hubId: id, body: "Glad to be here!" });
    expect(store.read(a).messages).toHaveLength(2);
    store.mutate(a, "chatDelete", { id: store.read(a).messages![1].id });
    expect(store.read(b).messages![1].removed).toBe(true);
    store.mutate(a, "communityManage", { id, action: "remove", userId: b });
    expect(store.read(b).messages).toEqual([]);
    expect(() =>
      store.mutate(b, "chatSend", { hubId: id, body: "Access ended" }),
    ).toThrow();
  });
  it("keeps youth friendships inside approved schools and closes private messages", async () => {
    const id = school();
    enroll(youth, id);
    const peer = store.identity(
      (await store.register({ email: "youth-peer@example.com", password }))
        .token,
    )!;
    store.mutate(peer, "profile", {
      ...preference,
      name: "Youth Peer",
      age: "youth",
      hubDirectoryVisible: true,
    });
    expect(() => store.mutate(youth, "connect", { id: peer })).toThrow();
    enroll(peer, id);
    store.mutate(youth, "connect", { id: peer });
    const connection = store.read(peer).connections![0];
    store.mutate(peer, "connectionRespond", {
      id: connection.id,
      accept: true,
    });
    expect(() =>
      store.mutate(peer, "chatSend", {
        connectionId: connection.id,
        body: "Private",
      }),
    ).toThrow();
    store.mutate(peer, "chatSend", { hubId: id, body: "School group hello" });
    expect(store.read(youth).messages).toHaveLength(1);
    expect(() => store.mutate(a, "connect", { id: peer })).toThrow();
  });
  it("shares court and time while keeping the booking reference with its organizer", () => {
    store.mutate(a, "createSpark", {
      ...activity,
      hubId: null,
      category: "badminton",
      venueId: "new-vision-badminton-court",
      spaceLabel: "7",
      bookingStatus: "booked",
      bookingReference: "PRIVATE-123",
    });
    const own = store.read(a).sparks[0];
    expect(own.bookingReference).toBe("PRIVATE-123");
    expect(store.read(b).sparks[0]).toMatchObject({
      spaceLabel: "7",
      bookingStatus: "booked",
      bookingReference: "",
    });
    expect(() =>
      store.mutate(a, "updateSpark", {
        ...activity,
        hubId: null,
        id: own.id,
        category: "badminton",
        venueId: "new-vision-badminton-court",
        city: "Kuala Lumpur",
      }),
    ).toThrow();
    expect(store.read(a).sparks[0].bookingReference).toBe("PRIVATE-123");
  });
  it("runs cross-account invitations, consent and reservations, and prevents withdrawal impersonation", () => {
    store.mutate(a, "createSpark", { ...activity, hubId: null });
    const id = store.read(a).sparks[0].id;
    store.mutate(b, "offer", {
      label: "Blair’s opted-in study offer",
      kind: "participant",
      city: "Petaling Jaya",
      hubId: null,
      skills: ["Maths"],
      quantity: 1,
      capacity: 1,
      cost: 0,
      needs: [],
      windows: activity.windows,
    });
    store.mutate(a, "unlock", { id });
    store.mutate(a, "send", { id });
    const proposal = store.read(b).proposals[0];
    expect(proposal.feasible).toBe(true);
    expect(store.read(b).notifications[0].href).toBe(`/groups/${id}`);
    expect(() =>
      store.mutate(a, "respond", {
        id,
        actionId: proposal.actions[0].id,
        accept: true,
      }),
    ).toThrow(/invited person/);
    expect(() => store.mutate(a, "confirm", { id })).toThrow(/accept/);
    store.mutate(b, "respond", {
      id,
      actionId: proposal.actions[0].id,
      accept: true,
    });
    store.mutate(a, "confirm", { id });
    expect(store.read(a).sparks[0].status).toBe("CONFIRMED");
    expect(store.read(b).candidates[0].reservations).toHaveLength(1);
    store.mutate(b, "withdraw", { id, userId: a });
    expect(store.read(a).sparks[0].participantIds).toContain(a);
    expect(store.read(a).sparks[0].participantIds).not.toContain(b);
    expect(store.read(b).candidates[0].reservations).toHaveLength(0);
  });
  it("keeps passwords hashed, rotates sessions, rejects incorrect logins and revokes logout", async () => {
    const row = store.db
      .prepare("SELECT password FROM accounts WHERE id=?")
      .get(a)!;
    expect(row.password).not.toContain(password);
    await expect(
      store.login({
        email: "alex@example.com",
        password: "incorrect-password",
      }),
    ).rejects.toThrow(/do not match/);
    const { token } = await store.login({
      email: "ALEX@example.com",
      password,
    });
    expect(store.identity(token)).toBe(a);
    expect(store.identity("forged")).toBeNull();
    store.logout(token);
    expect(store.identity(token)).toBeNull();
  });
  it("uses a private recovery key, revokes existing sessions and rotates the key", async () => {
    const account = await store.register({
      email: "recovery@example.com",
      password,
    });
    await expect(
      store.recover({
        email: "recovery@example.com",
        password: "a-new-password-123",
        recoveryKey: "0".repeat(48),
      }),
    ).rejects.toThrow(/incorrect/);
    const recovered = await store.recover({
      email: "recovery@example.com",
      password: "a-new-password-123",
      recoveryKey: account.recoveryKey,
    });
    expect(store.identity(account.token)).toBeNull();
    expect(store.identity(recovered.token)).not.toBeNull();
    expect(recovered.recoveryKey).not.toBe(account.recoveryKey);
    await expect(
      store.login({ email: "recovery@example.com", password }),
    ).rejects.toThrow();
  });
  it("persists account preferences across database reopen without seeding fictional records", () => {
    store.mutate(a, "createSpark", { ...activity, hubId: null, draft: true });
    store.close();
    store = new LocalAccounts(path.join(folder, "test.sqlite"));
    expect(store.read(a).profile.name).toBe("Alex Tan");
    expect(store.read(b).profile.name).toBe("Blair Lim");
    expect(store.read(a).sparks).toHaveLength(1);
    expect(store.read(b).sparks).toHaveLength(0);
    expect(store.read(b).hubs).toHaveLength(0);
  });
  it("isolates school activities until an invited membership is approved", () => {
    const id = school();
    store.mutate(a, "createSpark", { ...activity, hubId: id });
    expect(store.read(b).hubs).toHaveLength(0);
    expect(store.read(b).sparks).toHaveLength(0);
    const invitation = store.invite(a, id);
    store.mutate(b, "redeem", invitation);
    expect(store.read(b).memberships?.[0].status).toBe("pending");
    expect(store.read(b).sparks).toHaveLength(0);
    expect(() => store.directory(b, id)).toThrow();
    expect(() => store.mutate(youth, "redeem", invitation)).toThrow(
      /expired|used/,
    );
    store.mutate(a, "communityManage", { id, action: "approve", userId: b });
    expect(store.read(b).sparks).toHaveLength(1);
    expect(store.read(youth).sparks).toHaveLength(0);
  });
  it("keeps school directories private and prevents organizer privilege escalation", () => {
    const id = school();
    enroll(b, id);
    enroll(youth, id);
    const directory = store.directory(b, id).members;
    expect(directory.find((m) => m.userId === a)?.name).toBe("Private member");
    expect(JSON.stringify(directory)).not.toContain("alex@example.com");
    expect(directory.every((m) => m.age === undefined)).toBe(true);
    expect(() =>
      store.mutate(b, "communityManage", {
        id,
        action: "role",
        userId: b,
        role: "hub_admin",
      }),
    ).toThrow();
    store.mutate(a, "communityManage", {
      id,
      action: "role",
      userId: b,
      role: "organizer",
    });
    expect(store.invite(b, id).code).toHaveLength(24);
    expect(() =>
      store.mutate(b, "communityManage", {
        id,
        action: "role",
        userId: b,
        role: "hub_admin",
      }),
    ).toThrow();
    expect(() =>
      store.mutate(a, "communityManage", {
        id,
        action: "role",
        userId: a,
        role: "member",
      }),
    ).toThrow(/ownership/);
  });
  it("publishes own drafts and rejects cross-account edits and self-approved schools", async () => {
    store.mutate(a, "createSpark", { ...activity, hubId: null, draft: true });
    const draft = store.read(a).sparks[0];
    expect(() => store.mutate(b, "publishSpark", { id: draft.id })).toThrow();
    store.mutate(a, "publishSpark", { id: draft.id });
    const fresh = await store.register({
      email: "before-onboarding@example.com",
      password,
    });
    expect(store.read(store.identity(fresh.token)!).sparks).toEqual([]);
    expect(store.read(b).sparks[0].subject).toBe("Maths");
    expect(() =>
      store.mutate(b, "updateSpark", {
        ...activity,
        hubId: null,
        id: draft.id,
      }),
    ).toThrow();
    expect(() =>
      store.mutate(b, "approveHub", { id: school(), youthApproved: true }),
    ).toThrow(/administrator/);
    expect(() =>
      store.mutate(youth, "createSpark", { ...activity, hubId: null }),
    ).toThrow(/Under-18/);
  });
  it("persists participation requests and allows only the organizer to approve", () => {
    const id = school();
    enroll(b, id);
    store.mutate(a, "createSpark", { ...activity, hubId: id });
    const sparkId = store.read(a).sparks[0].id;
    store.mutate(b, "join", { id: sparkId });
    const request = store.read(b).participationRequests![0];
    expect(request.status).toBe("pending");
    expect(() =>
      store.mutate(b, "approveParticipation", { id: request.id, accept: true }),
    ).toThrow();
    store.mutate(a, "approveParticipation", { id: request.id, accept: true });
    expect(store.read(b).sparks[0].participantIds).toContain(b);
    expect(store.read(a).sparks[0].requirements).toHaveLength(0);
    store.mutate(b, "report", {
      id: sparkId,
      reason: "A test concern for our community organizer.",
    });
    expect(store.read(b).reports[0].reason).toContain("test concern");
  });
  it("keeps nearby listings opt-in, adult-only and blocked in both directions", () => {
    expect(store.people(a)).toHaveLength(0);
    store.mutate(b, "nearby", {
      visible: true,
      areaId: "petaling-jaya",
      bio: "Weekend games",
    });
    expect(store.people(a)).toHaveLength(1);
    expect(store.people(youth)).toHaveLength(0);
    store.mutate(b, "block", { id: a });
    expect(store.people(a)).toHaveLength(0);
    expect(store.read(a).blocked).toContain(b);
    store.mutate(a, "readNotifications");
    expect(
      JSON.parse(
        String(
          store.db.prepare("SELECT personal FROM accounts WHERE id=?").get(a)!
            .personal,
        ),
      ).blocked,
    ).toEqual([]);
  });
});
