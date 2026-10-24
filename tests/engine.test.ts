import { describe, expect, it } from "vitest";
import { afternoon, candidates, saturday, sparks } from "../src/lib/fixtures";
import {
  canConfirm,
  contains,
  overlaps,
  SEARCH_LIMIT,
  unlock,
  unlockPortfolio,
} from "../src/lib/engine";
const game = () => structuredClone(sparks[0]);
const offers = () => structuredClone(candidates);
describe("UNLOCK dependency search", () => {
  it("counts a facilitator as one person without adding a duplicate participant requirement", () => {
    const s = game();
    s.target = 2;
    s.participantIds = ["demo-you"];
    s.requirements = [{ id: "lead", kind: "facilitator", quantity: 1 }];
    const facilitator = {
      ...offers()[0],
      kind: "facilitator" as const,
      needs: [],
      quantity: 1,
    };
    const proposal = unlock(s, [facilitator]);
    expect(proposal.feasible).toBe(true);
    expect(proposal.actions.map((a) => a.kind)).toEqual(["facilitator"]);
  });
  it("cannot count the same person as both a participant and a facilitator", () => {
    const s = game();
    s.target = 3;
    s.participantIds = ["demo-you"];
    s.requirements = [
      { id: "lead", kind: "facilitator", quantity: 1 },
      { id: "person", kind: "participant", quantity: 1 },
    ];
    const person = { ...offers()[0], needs: [], quantity: 1 };
    expect(
      unlock(s, [
        person,
        { ...person, id: "same-owner-facilitator", kind: "facilitator" },
      ]).feasible,
    ).toBe(false);
  });
  it("does not include unpublished drafts in a portfolio", () => {
    const s = game();
    s.status = "DRAFT";
    expect(unlockPortfolio([s], offers()).proposals).toHaveLength(0);
  });
  it("allocates multiple units from one offer across resource dependencies", () => {
    const s = game();
    s.requirements.push({ id: "extra-racket", kind: "racket", quantity: 1 });
    const pool = offers();
    pool[1].quantity = 2;
    const p = unlock(s, pool);
    expect(p.feasible).toBe(true);
    expect(p.actions).toHaveLength(2);
    expect(p.actions.find((a) => a.kind === "racket")?.quantity).toBe(2);
  });
  it("finds a fourth player and the dependent spare racket", () => {
    const p = unlock(game(), offers());
    expect(p.feasible).toBe(true);
    expect(p.actions.map((a) => a.kind)).toEqual(["participant", "racket"]);
    expect(p.baselineResolved).toBe(0);
    expect(p.actions.every((a) => a.state === "pending")).toBe(true);
    expect(canConfirm(p)).toBe(false);
  });
  it("is deterministic under input order changes", () => {
    const a = unlock(game(), offers()),
      b = unlock(game(), offers().reverse());
    expect(a.actions).toEqual(b.actions);
    expect(a.score).toEqual(b.score);
    expect(a.window).toEqual(b.window);
  });
  it("retains the missing dependency when equipment is unavailable", () => {
    const p = unlock(
      game(),
      offers().filter((c) => c.kind !== "racket"),
    );
    expect(p.feasible).toBe(false);
    expect(p.remainingBlockers.join(" ")).toContain("racket");
  });
  it("chooses an alternative shared time for an approved tutor and room", () => {
    const p = unlock(structuredClone(sparks[1]), offers());
    expect(p.feasible).toBe(true);
    expect(p.window).toEqual(afternoon);
    expect(p.actions.map((a) => a.kind).sort()).toEqual(["room", "tutor"]);
  });
  it("never confirms a feasible proposal before every acceptance", () => {
    const p = unlock(game(), offers());
    p.actions[0].state = "accepted";
    expect(canConfirm(p)).toBe(false);
    p.actions[1].state = "accepted";
    expect(canConfirm(p)).toBe(true);
  });
  it("does not mutate its input data or reserve resources", () => {
    const pool = offers();
    const before = JSON.stringify(pool);
    unlock(game(), pool);
    expect(JSON.stringify(pool)).toBe(before);
  });
});
describe("hard constraints", () => {
  it("rejects multiple participation units from one person", () => {
    const pool = offers();
    pool[0].quantity = 2;
    expect(unlock(game(), pool).feasible).toBe(false);
  });
  it("excludes windows that conflict for existing participants", () => {
    const s = game();
    s.conflicts = [saturday, afternoon];
    expect(unlock(s, offers()).feasible).toBe(false);
  });
  it.each(["optedIn", "approved"] as const)("requires %s", (key) => {
    const pool = offers();
    pool[0][key] = false;
    expect(unlock(game(), pool).feasible).toBe(false);
  });
  it("excludes blocked accounts", () =>
    expect(unlock(game(), offers(), ["hana"]).feasible).toBe(false));
  it("rejects a youth candidate in public adult matching", () => {
    const pool = offers();
    pool[0].age = "youth";
    expect(unlock(game(), pool).feasible).toBe(false);
  });
  it("rejects people in a different hub", () => {
    const pool = offers();
    pool[0].hubId = "school-hub";
    expect(unlock(game(), pool).feasible).toBe(false);
  });
  it("rejects another city", () => {
    const pool = offers();
    pool[0].city = "Ipoh";
    expect(unlock(game(), pool).feasible).toBe(false);
  });
  it("rejects incompatible skills", () => {
    const pool = offers();
    pool[0].skills = ["beginner"];
    expect(unlock(game(), pool).feasible).toBe(false);
  });
  it("requires full window coverage", () => {
    const s = game();
    s.windows = [saturday];
    const pool = offers();
    pool[0].windows = [
      { start: "2026-10-24T09:30:00+08:00", end: saturday.end },
    ];
    expect(unlock(s, pool).feasible).toBe(false);
  });
  it("rejects conflicting reservations", () => {
    const s = game();
    s.windows = [saturday];
    const pool = offers();
    pool[1].reservations = [saturday];
    expect(unlock(s, pool).feasible).toBe(false);
  });
  it("treats adjacent sessions as non-conflicting", () => {
    expect(
      overlaps(saturday, {
        start: saturday.end,
        end: "2026-10-24T12:00:00+08:00",
      }),
    ).toBe(false);
    expect(contains(saturday, saturday)).toBe(true);
  });
  it("rejects rooms with insufficient capacity", () => {
    const pool = offers();
    pool.find((c) => c.kind === "room")!.capacity = 3;
    expect(unlock(structuredClone(sparks[1]), pool).feasible).toBe(false);
  });
  it("respects the total budget", () => {
    const pool = offers();
    pool[1].cost = 100;
    expect(unlock(game(), pool).feasible).toBe(false);
  });
  it("cannot count the same person as two separate participants", () => {
    const s = game();
    s.target = 5;
    s.requirements[0].quantity = 2;
    const pool = offers();
    pool.push({ ...pool[0], id: "same-person-second-offer" });
    expect(unlock(s, pool).feasible).toBe(false);
  });
  it("returns a blocked result for empty or invalid time windows", () => {
    const s = game();
    s.windows = [];
    expect(unlock(s, offers()).feasible).toBe(false);
    s.windows = [{ start: "bad", end: "bad" }];
    expect(unlock(s, offers()).window).toBeNull();
  });
  it("prefers a less committed candidate when commitments and costs tie", () => {
    const pool = offers();
    pool.push({ ...pool[0], id: "less-committed", needs: [], commitments: 0 });
    pool[0].needs = [];
    pool[0].commitments = 10;
    expect(unlock(game(), pool).actions[0].candidateId).toBe("less-committed");
  });
  it("stays within the documented bound", () => {
    const s = game();
    s.target = 15;
    s.requirements = [{ id: "many", kind: "participant", quantity: 12 }];
    const pool = Array.from({ length: 25 }, (_, i) => ({
      ...offers()[0],
      id: `person-${i}`,
      ownerId: `owner-${i}`,
      needs: [],
    }));
    const result = unlock(s, pool);
    expect(result.explored).toBeLessThanOrEqual(SEARCH_LIMIT);
    expect(result.truncated).toBe(true);
  });
});
describe("portfolio allocation", () => {
  it("does not double-book already connected people even without a shared resource", () => {
    const sessions = structuredClone(sparks.slice(2, 4)).map((s) => ({
      ...s,
      requirements: [],
      windows: [saturday],
    }));
    expect(unlockPortfolio(sessions, offers()).proposals).toHaveLength(1);
  });
  it("reuses a shared projector at non-overlapping times", () => {
    const result = unlockPortfolio(
      structuredClone(sparks.slice(2, 4)),
      offers(),
    );
    expect(result.proposals).toHaveLength(2);
    const [a, b] = result.proposals;
    expect(overlaps(a.window!, b.window!)).toBe(false);
    expect(a.actions[0].candidateId).toBe(b.actions[0].candidateId);
  });
  it("never allocates one exclusive resource twice at the same time", () => {
    const sessions = structuredClone(sparks.slice(2, 4)).map((s) => ({
      ...s,
      windows: [saturday],
    }));
    expect(unlockPortfolio(sessions, offers()).proposals).toHaveLength(1);
  });
  it("prioritizes activities then participation", () => {
    const sessions = structuredClone(sparks.slice(2, 4)).map((s) => ({
      ...s,
      windows: [saturday],
    }));
    const result = unlockPortfolio(sessions, offers());
    expect(result.proposals[0].sparkId).toBe("code-and-kopi");
  });
});
