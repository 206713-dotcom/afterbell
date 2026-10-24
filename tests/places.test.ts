import { describe, expect, it } from "vitest";
import { venues, venueById, providerEmbed } from "@/lib/venues";
import { sparkSchema, cities } from "@/lib/validation";
import { sessionCalendar } from "@/lib/calendar";
import { demoState } from "@/lib/fixtures";

const plan = {
  title: "A game at New Vision",
  description: "Bring your racket for a friendly game with the group.",
  category: "badminton",
  city: "Petaling Jaya",
  hubId: null,
  target: 2,
  skill: "Intermediate",
  budget: 0,
  requirements: [],
  venueId: "new-vision-badminton-court",
  spaceLabel: "7",
  bookingStatus: "booked",
  bookingReference: "PRIVATE-REF",
  windows: [
    { start: "2026-11-01T09:00:00+08:00", end: "2026-11-01T11:00:00+08:00" },
  ],
};
describe("source-backed places and booking details", () => {
  it("keeps unique, linked places in supported cities, with both court and study choices", () => {
    expect(
      venues.filter((v) => v.kind === "badminton").length,
    ).toBeGreaterThanOrEqual(40);
    expect(
      venues.filter((v) => v.kind === "study").length,
    ).toBeGreaterThanOrEqual(10);
    expect(new Set(venues.map((v) => v.id)).size).toBe(venues.length);
    for (const v of venues) {
      expect(cities).toContain(v.city);
      expect(new URL(v.source).protocol).toBe("https:");
      expect(new URL(v.bookingUrl).protocol).toBe("https:");
      if (v.provider === "AFA")
        expect(providerEmbed(v)).toMatch(
          /^https:\/\/book\.afa-sports\.com\/\?auth=\d+$/,
        );
    }
  });
  it("requires a matching place, one booked window and a private reference", () => {
    expect(sparkSchema.safeParse(plan).success).toBe(true);
    for (const change of [
      { city: "Kuala Lumpur" },
      { category: "study" },
      { venueId: "made-up" },
      { venueId: null },
      { bookingReference: "" },
      { spaceLabel: "" },
      { windows: [...plan.windows, ...plan.windows] },
    ]) {
      expect(sparkSchema.safeParse({ ...plan, ...change }).success).toBe(false);
    }
    expect(
      sparkSchema.safeParse({
        ...plan,
        category: "study",
        venueId: "metime-jaya-one",
      }).success,
    ).toBe(true);
  });
  it("only embeds the allowlisted provider and exports the court without the private reference", () => {
    const v = venueById(plan.venueId)!;
    for (const bookingUrl of [
      "https://evil.example/?auth=34",
      "http://book.afa-sports.com/?auth=34",
      "https://book.afa-sports.com/?auth=abc",
    ]) {
      expect(providerEmbed({ ...v, bookingUrl })).toBeNull();
    }
    const spark = {
      ...demoState().sparks[0],
      ...sparkSchema.parse(plan),
      status: "CONFIRMED" as const,
    };
    const calendar = sessionCalendar(spark, plan.windows[0]);
    expect(calendar).toContain("LOCATION:New Vision");
    expect(calendar).toContain(" · 7");
    expect(calendar).not.toContain("PRIVATE-REF");
  });
});
