import { describe, expect, it } from "vitest";
import { demoState } from "@/lib/fixtures";
import { personalPlans, planHref, planWindow } from "@/lib/plans";
import type { Spark } from "@/lib/types";

describe("personal plan folders", () => {
  it("keeps active plans separate from private drafts and history", () => {
    const state = demoState();
    const base = state.sparks[0];
    state.sparks = (
      ["BLOCKED", "CONFIRMED", "COMPLETED", "CANCELLED", "DRAFT"] as const
    ).map((status) => ({ ...base, id: status, status }));
    expect(personalPlans(state, "active").map((s) => s.id)).toEqual([
      "BLOCKED",
      "CONFIRMED",
    ]);
    expect(personalPlans(state, "confirmed").map((s) => s.id)).toEqual([
      "CONFIRMED",
    ]);
    expect(personalPlans(state, "past").map((s) => s.id)).toEqual([
      "COMPLETED",
      "CANCELLED",
    ]);
    expect(personalPlans(state, "drafts").map((s) => s.id)).toEqual(["DRAFT"]);
  });
  it("includes participation and pending invitations, excluding declined offers", () => {
    const state = demoState();
    const base = state.sparks[0];
    state.sparks = ["joined", "pending", "declined", "other", "cancelled"].map(
      (id) => ({
        ...base,
        id,
        ownerId: "someone-else",
        participantIds: ["joined", "cancelled"].includes(id)
          ? [state.profile.id]
          : [],
        status: id === "cancelled" ? "CANCELLED" : "BLOCKED",
      }),
    );
    state.proposals = ["pending", "declined"].map((id) => ({
      sparkId: id,
      actions: [{ ownerId: state.profile.id, state: id }],
    })) as typeof state.proposals;
    expect(personalPlans(state, "active").map((s) => s.id)).toEqual([
      "joined",
      "pending",
    ]);
    expect(personalPlans(state, "past").map((s) => s.id)).toEqual([
      "cancelled",
    ]);
  });
  it("does not expose inaccessible saved activities or another person's drafts", () => {
    const state = demoState();
    const base = state.sparks[0];
    state.joined = [];
    state.sparks = [
      { ...base, id: "private", hubId: "school-hub" },
      { ...base, id: "draft", ownerId: "someone-else", status: "DRAFT" },
    ];
    state.saved = ["private", "draft"];
    expect(personalPlans(state, "saved")).toEqual([]);
    expect(personalPlans(state, "drafts")).toEqual([]);
  });
  it("returns all matching records rather than only the home preview", () => {
    const state = demoState();
    state.sparks = Array.from({ length: 12 }, (_, i) => ({
      ...state.sparks[0],
      id: `plan-${i}`,
    }));
    expect(personalPlans(state, "active")).toHaveLength(12);
  });
  it("uses the agreed proposal window and routes confirmed plans to the session", () => {
    const state = demoState();
    const spark: Spark = { ...state.sparks[0], status: "CONFIRMED" };
    const window = {
      start: "2026-10-25T09:00:00+08:00",
      end: "2026-10-25T11:00:00+08:00",
    };
    state.proposals = [{ sparkId: spark.id, window }] as typeof state.proposals;
    expect(planWindow(state, spark)).toEqual(window);
    expect(planHref(state, spark)).toBe(`/groups/${spark.id}`);
    expect(planHref(state, { ...spark, status: "DRAFT" })).toBe(
      `/sparks/${spark.id}/edit`,
    );
  });
});
