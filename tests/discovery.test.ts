import { describe, expect, it } from "vitest";
import { demoState, afternoon, saturday } from "@/lib/fixtures";
import {
  accessibleSparks,
  discover,
  matchReasons,
  slotDetails,
  type DiscoveryFilters,
} from "@/lib/discovery";
import { sessionCalendar } from "@/lib/calendar";
const filters: DiscoveryFilters = {
  category: "all",
  query: "",
  city: "all",
  saved: false,
  date: "",
  time: "any",
  needsPeople: false,
  sort: "recommended",
};

describe("personal discovery", () => {
  it("ranks the home city first and explains the preference signals", () => {
    const state = demoState();
    expect(discover(state, filters)[0].city).toBe(state.profile.city);
    expect(matchReasons(state.sparks[0], state.profile)).toEqual(
      expect.arrayContaining([
        "In your city",
        "Your kind of thing",
        "Fits your usual availability",
      ]),
    );
  });
  it("requires date and period to match the same window", () => {
    const state = demoState();
    state.sparks[0].windows = [
      saturday,
      { start: "2026-10-25T14:00:00+08:00", end: "2026-10-25T16:00:00+08:00" },
    ];
    expect(
      discover(state, {
        ...filters,
        city: "Petaling Jaya",
        date: "2026-10-24",
        time: "afternoon",
      }),
    ).toHaveLength(0);
    expect(
      discover(state, {
        ...filters,
        city: "Petaling Jaya",
        date: "2026-10-25",
        time: "afternoon",
      }),
    ).toHaveLength(1);
  });
  it("sorts by the earliest matching window rather than a filtered-out time", () => {
    const state = demoState();
    state.sparks = [
      state.sparks[0],
      {
        ...state.sparks[0],
        id: "earlier-afternoon",
        windows: [
          {
            start: "2026-10-24T12:00:00+08:00",
            end: "2026-10-24T13:00:00+08:00",
          },
        ],
      },
    ];
    expect(
      discover(state, { ...filters, time: "afternoon", sort: "soonest" }).map(
        (s) => s.id,
      ),
    ).toEqual(["earlier-afternoon", "saturday-doubles"]);
  });
  it("normalizes UTC timestamps into Malaysian dates and periods", () => {
    expect(
      slotDetails({
        start: "2026-10-23T18:00:00Z",
        end: "2026-10-23T19:00:00Z",
      }),
    ).toEqual({ date: "2026-10-24", period: "morning", weekend: true });
  });
  it("combines bookmarks, city, query, and open-space constraints", () => {
    const state = demoState();
    state.saved = ["saturday-doubles"];
    const query = {
      ...filters,
      saved: true,
      city: "Petaling Jaya",
      query: "  DOUBLES  ",
      needsPeople: true,
    };
    expect(discover(state, query).map((s) => s.id)).toEqual([
      "saturday-doubles",
    ]);
    state.sparks[0].status = "CONFIRMED";
    expect(discover(state, query)).toHaveLength(0);
  });
  it("excludes blocked people, cancelled Sparks, and inaccessible private hubs", () => {
    const state = demoState();
    state.blocked = [state.sparks[0].ownerId];
    expect(
      accessibleSparks(state).some((s) => s.ownerId === state.blocked[0]),
    ).toBe(false);
    state.blocked = [];
    state.joined = [];
    expect(accessibleSparks(state).some((s) => s.hubId === "school-hub")).toBe(
      false,
    );
    state.sparks[0].status = "CANCELLED";
    expect(
      accessibleSparks(state).some((s) => s.id === "saturday-doubles"),
    ).toBe(false);
  });
  it("requires approved youth hubs as well as membership for under-18 discovery", () => {
    const state = demoState();
    state.profile.age = "youth";
    expect(accessibleSparks(state).map((s) => s.hubId)).toEqual(["school-hub"]);
    state.hubs.find((h) => h.id === "school-hub")!.youthApproved = false;
    expect(accessibleSparks(state)).toHaveLength(0);
  });
});

describe("confirmed session calendar", () => {
  it("exports exact UTC times and escapes text that could inject calendar properties", () => {
    const spark = {
      ...demoState().sparks[0],
      status: "CONFIRMED" as const,
      title: "Game, together; yes\nATTENDEE:untrusted@example.com",
    };
    const output = sessionCalendar(
      spark,
      afternoon,
      new Date("2026-10-18T00:00:00Z"),
    );
    expect(output).toContain(
      "DTSTART:20261024T060000Z\r\nDTEND:20261024T080000Z",
    );
    expect(output).toContain("SUMMARY:Game\\, together\\; yes\\nATTENDEE:");
    expect(output).not.toContain("\r\nATTENDEE:");
    expect(output).toContain("will not update automatically.");
  });
  it("folds Unicode content without splitting characters or exceeding 75 octets", () => {
    const spark = {
      ...demoState().sparks[0],
      status: "CONFIRMED" as const,
      title: "一起学习🏸".repeat(30),
    };
    const output = sessionCalendar(spark, saturday);
    expect(
      output
        .split("\r\n")
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
    expect(output.replaceAll("\r\n ", "")).toContain(
      `SUMMARY:${spark.title}\r\n`,
    );
  });
  it("rejects a calendar event before explicit session confirmation", () => {
    expect(() => sessionCalendar(demoState().sparks[0], saturday)).toThrow(
      /Confirm the session/,
    );
  });
});
