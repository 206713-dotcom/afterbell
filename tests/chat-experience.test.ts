import { describe, it, expect } from "vitest";
import {
  chatDraftKey,
  clearChatDrafts,
  pruneChatDrafts,
  readChatDraft,
  writeChatDraft,
} from "@/lib/chat-drafts";
import { connectionInbox } from "@/lib/conversations";
import { demoState } from "@/lib/fixtures";
import { upgradeDemoCommunities } from "@/lib/community-fixtures";
import { upgradeDemoSocial } from "@/lib/social-fixtures";
import {
  initialActivityCategory,
  tomorrowInMalaysia,
} from "@/lib/activity-defaults";

const fixture = () => upgradeDemoSocial(upgradeDemoCommunities(demoState()));
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  key(i: number) {
    return [...this.items.keys()][i] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
}
describe("private tab-local chat drafts", () => {
  it("isolates drafts by actor, mode and conversation, then clears a sent draft", () => {
    const storage = new MemoryStorage();
    const key = chatDraftKey("alex", false, "connection:adam");
    expect(writeChatDraft(storage, key, "See you at four", 1000)).toBe(true);
    expect(readChatDraft(storage, key, 1001).body).toBe("See you at four");
    for (const other of [
      chatDraftKey("sam", false, "connection:adam"),
      chatDraftKey("alex", true, "connection:adam"),
      chatDraftKey("alex", false, "hub:adam"),
    ])
      expect(readChatDraft(storage, other, 1001).body).toBe("");
    writeChatDraft(storage, key, "");
    expect(storage.getItem(key)).toBeNull();
  });
  it("expires drafts after 24 hours and rejects oversized or malformed records", () => {
    const storage = new MemoryStorage(),
      key = chatDraftKey("alex", false, "hub:school");
    writeChatDraft(storage, key, "Reminder", 1000);
    expect(readChatDraft(storage, key, 1000 + 86400000).body).toBe("");
    expect(storage.getItem(key)).toBeNull();
    for (const raw of [
      "not json",
      "null",
      JSON.stringify({ body: "x".repeat(1501), savedAt: 1000 }),
      JSON.stringify({ body: "hi", savedAt: 3000 }),
    ]) {
      storage.setItem(key, raw);
      expect(readChatDraft(storage, key, 2000).body).toBe("");
      expect(storage.getItem(key)).toBeNull();
    }
  });
  it("fails gracefully when storage is blocked or full", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      key: () => null,
      length: 0,
    };
    expect(readChatDraft(broken, "key")).toEqual({
      body: "",
      available: false,
    });
    expect(writeChatDraft(broken, "key", "hello")).toBe(false);
    expect(writeChatDraft(null, "key", "hello")).toBe(false);
    expect(() => clearChatDrafts(broken)).not.toThrow();
  });
  it("prunes drafts after disconnection, blocking or loss of school membership", () => {
    const s = fixture(),
      storage = new MemoryStorage();
    const dm = chatDraftKey(s.profile.id, true, "connection:demo-adam-friend");
    const hub = chatDraftKey(s.profile.id, true, "hub:school-hub");
    const stranger = chatDraftKey(
      s.profile.id,
      true,
      "connection:someone-else",
    );
    const otherAccount = chatDraftKey("another-actor", false, "hub:private");
    for (const key of [dm, hub, stranger, otherAccount])
      writeChatDraft(storage, key, "unsent");
    pruneChatDrafts(storage, s, true);
    expect(storage.getItem(stranger)).toBeNull();
    expect(storage.getItem(dm)).not.toBeNull();
    expect(storage.getItem(hub)).not.toBeNull();
    expect(storage.getItem(otherAccount)).not.toBeNull();
    s.connections![0].status = "declined";
    s.joined = [];
    pruneChatDrafts(storage, s, true);
    expect(storage.getItem(dm)).toBeNull();
    expect(storage.getItem(hub)).toBeNull();
    s.connections![0].status = "accepted";
    s.blocked.push("adam");
    writeChatDraft(storage, dm, "blocked unsent");
    pruneChatDrafts(storage, s, true);
    expect(storage.getItem(dm)).toBeNull();
  });
  it("clears chat drafts on identity changes without removing other tab storage", () => {
    const storage = new MemoryStorage();
    storage.setItem("other-app", "keep");
    writeChatDraft(storage, chatDraftKey("a", false, "hub:1"), "a");
    writeChatDraft(storage, chatDraftKey("b", true, "hub:2"), "b");
    clearChatDrafts(storage);
    expect(storage.length).toBe(1);
    expect(storage.getItem("other-app")).toBe("keep");
  });
});
describe("connection inbox", () => {
  it("orders accepted conversations by recent messages and searches people", () => {
    const s = fixture();
    s.connections![1].status = "accepted";
    s.messages!.push({
      id: "new",
      hubId: null,
      connectionId: "demo-hana-request",
      senderId: s.profile.id,
      senderName: s.profile.name,
      body: "Study\n at four?",
      createdAt: "2026-10-23T03:00:00Z",
    });
    const inbox = connectionInbox(s);
    expect(inbox.map((t) => t.person.id)).toEqual(["hana", "adam"]);
    expect(inbox[0].preview).toBe("You: Study at four?");
    expect(connectionInbox(s, " ADAM ").map((t) => t.person.id)).toEqual([
      "adam",
    ]);
  });
  it("does not preview pending, blocked or third-party conversations", () => {
    const s = fixture();
    expect(connectionInbox(s).map((t) => t.person.id)).toEqual(["adam"]);
    s.connections!.push({
      id: "third",
      requesterId: "someone",
      addresseeId: "hana",
      status: "accepted",
      createdAt: "2026-10-23T03:00:00Z",
    });
    expect(connectionInbox(s).length).toBe(1);
    s.blocked.push("adam");
    expect(connectionInbox(s)).toEqual([]);
  });
  it("does not expose removed message text or unrelated authors in previews", () => {
    const s = fixture();
    s.messages![1].removed = true;
    expect(connectionInbox(s)[0].preview).toBe("Message removed");
    s.messages!.push({
      ...s.messages![1],
      id: "forged",
      removed: false,
      senderId: "stranger",
      body: "Private outsider",
      createdAt: "2026-10-23T03:00:00Z",
    });
    expect(connectionInbox(s)[0].preview).toBe("Message removed");
  });
  it("keeps youth connections in shared communities without private-message previews", () => {
    const s = fixture();
    s.profile.age = "youth";
    const adam = s.connectionPeople!.find((p) => p.id === "adam")!;
    adam.age = "youth";
    adam.sharedHubIds = ["school-hub"];
    expect(connectionInbox(s)[0].preview).toBe("Shared school conversation");
    expect(connectionInbox(s)[0].last).toBeUndefined();
    s.joined = [];
    expect(connectionInbox(s)).toEqual([]);
  });
});
describe("new activity defaults", () => {
  it("computes tomorrow using Malaysia midnight across UTC and year boundaries", () => {
    expect(tomorrowInMalaysia(new Date("2026-10-23T15:59:59Z"))).toBe(
      "2026-10-24",
    );
    expect(tomorrowInMalaysia(new Date("2026-10-23T16:00:00Z"))).toBe(
      "2026-10-25",
    );
    expect(tomorrowInMalaysia(new Date("2026-12-31T18:00:00Z"))).toBe(
      "2027-01-02",
    );
    expect(tomorrowInMalaysia(new Date("2028-02-28T08:00:00Z"))).toBe(
      "2028-02-29",
    );
  });
  it("accepts supported category deep links and rejects unknown values", () => {
    expect(initialActivityCategory("study")).toBe("study");
    expect(initialActivityCategory("tutoring")).toBe("tutoring");
    expect(initialActivityCategory("<script>")).toBeUndefined();
    expect(initialActivityCategory()).toBeUndefined();
  });
});
