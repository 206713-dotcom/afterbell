import { describe, expect, it } from "vitest";
import { demoState } from "@/lib/fixtures";
import { upgradeDemoCommunities } from "@/lib/community-fixtures";
import { upgradeDemoSocial } from "@/lib/social-fixtures";
import { incomingFriendRequests } from "@/lib/social";
import { workspaceSearch, placeHref } from "@/lib/workspace-search";
import { venues, venueLocality } from "@/lib/venues";

const fixture = () => upgradeDemoSocial(upgradeDemoCommunities(demoState()));

describe("workspace discovery and friend request reminders", () => {
  it("finds operator-listed places and encodes a selected, filtered directory URL", () => {
    const results = workspaceSearch(fixture(), "new vision");
    expect(results.places.map((v) => v.id)).toContain(
      "new-vision-badminton-court",
    );
    const url = new URL(
      placeHref(results.places[0]),
      "https://afterbell.example",
    );
    expect(url.pathname).toBe("/places");
    expect(url.searchParams.get("place")).toBe(results.places[0].id);
    expect(url.searchParams.get("q")).toBe(results.places[0].name);
    expect(url.searchParams.get("kind")).toBe("badminton");
    expect(workspaceSearch(fixture(), "library").places.length).toBeGreaterThan(
      0,
    );
  });
  it("keeps empty searches empty and avoids repeated locality text", () => {
    expect(workspaceSearch(fixture(), "  ")).toEqual({
      activities: [],
      hubs: [],
      places: [],
      friends: [],
    });
    expect(
      venueLocality({ ...venues[0], city: "Kajang", area: "Kajang" }),
    ).toBe("Kajang");
    expect(
      venueLocality({ ...venues[0], city: "Petaling Jaya", area: "SS2" }),
    ).toBe("SS2, Petaling Jaya");
  });
  it("excludes inaccessible schools, other members' drafts and blocked organizers", () => {
    const s = fixture();
    const school = s.hubs.find((h) => h.id === "bayu-school")!;
    expect(workspaceSearch(s, school.name).hubs).toEqual([]);
    const template = s.sparks[0];
    s.sparks = [
      {
        ...template,
        id: "mine",
        title: "Needle own draft",
        ownerId: s.profile.id,
        hubId: null,
        status: "DRAFT",
      },
      {
        ...template,
        id: "others",
        title: "Needle private draft",
        ownerId: "other",
        hubId: null,
        status: "DRAFT",
      },
      {
        ...template,
        id: "blocked",
        title: "Needle blocked plan",
        ownerId: "blocked",
        hubId: null,
        status: "BLOCKED",
      },
    ];
    s.blocked.push("blocked");
    expect(workspaceSearch(s, "needle").activities.map((p) => p.id)).toEqual([
      "mine",
    ]);
  });
  it("only returns accepted connections involving the current member", () => {
    const s = fixture();
    expect(workspaceSearch(s, "Adam").friends[0].href).toBe(
      "/connections?chat=demo-adam-friend",
    );
    expect(workspaceSearch(s, "Hana").friends).toEqual([]);
    s.connections!.push({
      id: "third-party",
      requesterId: "someone",
      addresseeId: "hana",
      status: "accepted",
      createdAt: new Date().toISOString(),
    });
    expect(workspaceSearch(s, "Hana").friends).toEqual([]);
    s.blocked.push("adam");
    expect(workspaceSearch(s, "Adam").friends).toEqual([]);
  });
  it("routes youth connections to an approved shared school instead of a private DM", () => {
    const s = fixture();
    s.profile.age = "youth";
    const adam = s.connectionPeople!.find((p) => p.id === "adam")!;
    adam.age = "youth";
    adam.sharedHubIds = ["bayu-school", "school-hub"];
    expect(workspaceSearch(s, "Adam").friends[0].href).toBe(
      "/hubs/school-hub?tab=chat",
    );
    s.joined = [];
    expect(workspaceSearch(s, "Adam").friends).toEqual([]);
  });
  it("counts only incoming, pending and eligible requests", () => {
    const s = fixture();
    expect(incomingFriendRequests(s).map((c) => c.id)).toEqual([
      "demo-hana-request",
    ]);
    const request = s.connections!.find((c) => c.id === "demo-hana-request")!;
    request.status = "accepted";
    expect(incomingFriendRequests(s)).toEqual([]);
    request.status = "pending";
    request.addresseeId = "someone-else";
    expect(incomingFriendRequests(s)).toEqual([]);
    request.addresseeId = s.profile.id;
    s.blocked.push("hana");
    expect(incomingFriendRequests(s)).toEqual([]);
  });
  it("does not offer adult-to-youth connection matches or request reminders", () => {
    const s = fixture();
    for (const p of s.connectionPeople!) p.age = "youth";
    expect(incomingFriendRequests(s)).toEqual([]);
    expect(workspaceSearch(s, "Adam").friends).toEqual([]);
  });
});
