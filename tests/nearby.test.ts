import { describe, expect, it } from "vitest";
import {
  areas,
  areaById,
  cityArea,
  distanceKm,
  distanceLabel,
  nearestArea,
} from "@/lib/locations";
import { findNearbyPeople } from "@/lib/nearby";
import { nearbyPeople } from "@/lib/nearby-fixtures";
import { demoState } from "@/lib/fixtures";
import { nearbySchema } from "@/lib/validation";
import { applyDemo } from "@/components/store";
const profile = demoState().profile;
describe("nearby discovery", () => {
  it("computes symmetric great-circle distances and finds the nearest broad area", () => {
    const pj = cityArea("Petaling Jaya"),
      kl = cityArea("Kuala Lumpur");
    expect(distanceKm(pj, pj)).toBe(0);
    expect(distanceKm(pj, kl)).toBeCloseTo(distanceKm(kl, pj), 8);
    expect(distanceKm(pj, kl)).toBeGreaterThan(8);
    expect(distanceKm(pj, kl)).toBeLessThan(11);
    expect(nearestArea({ lat: 3.1182, lng: 101.6222 }).id).toBe("ss2");
  });
  it("uses coarse distance bands without exact position claims", () => {
    expect([0, 5, 10, 25, 50, 100].map(distanceLabel)).toEqual([
      "Under 5 km",
      "About 5–10 km",
      "About 10–25 km",
      "About 25–50 km",
      "About 50–100 km",
      "Over 100 km",
    ]);
  });
  it("filters radius, interests, subjects, blocks, and the viewer's own profile", () => {
    const origin = cityArea("Petaling Jaya");
    expect(
      findNearbyPeople(nearbyPeople, profile, [], origin, 5)
        .map((row) => row.person.id)
        .sort(),
    ).toEqual(["adam", "hana", "mei"]);
    expect(
      findNearbyPeople(nearbyPeople, profile, ["hana"], origin, 5, "Badminton")
        .map((row) => row.person.id)
        .sort(),
    ).toEqual(["adam", "mei"]);
    expect(
      findNearbyPeople(
        nearbyPeople,
        { ...profile, id: "hana" },
        [],
        origin,
        5,
      ).some((row) => row.person.id === "hana"),
    ).toBe(false);
    expect(
      findNearbyPeople(
        nearbyPeople,
        profile,
        [],
        origin,
        25,
        "all",
        false,
        " PHYSICS ",
      )
        .map((row) => row.person.id)
        .sort(),
    ).toEqual(["dev", "nora"]);
  });
  it("can prioritize shared interests without inventing a compatibility percentage", () => {
    const rows = findNearbyPeople(
      nearbyPeople,
      profile,
      [],
      cityArea("Petaling Jaya"),
      25,
      "all",
      true,
      "",
      "shared",
    );
    expect(rows.every((row) => row.shared.length > 0)).toBe(true);
    expect(rows[0].shared.length).toBe(
      Math.max(...rows.map((row) => row.shared.length)),
    );
  });
  it("keeps minors out of public nearby discovery", () => {
    expect(
      findNearbyPeople(
        nearbyPeople,
        { ...profile, age: "youth" },
        [],
        cityArea("Petaling Jaya"),
        3000,
      ),
    ).toEqual([]);
    expect(() =>
      applyDemo(
        { ...demoState(), profile: { ...profile, age: "youth" } },
        "nearby",
        { areaId: "ss2", bio: "Hello", visible: true },
      ),
    ).toThrow(/adult accounts/);
  });
  it("validates explicitly shared areas and never accepts device coordinates as settings", () => {
    expect(
      nearbySchema.safeParse({ areaId: "unknown", bio: "", visible: true })
        .success,
    ).toBe(false);
    expect(
      nearbySchema.safeParse({ areaId: null, bio: "", visible: true }).success,
    ).toBe(false);
    expect(
      nearbySchema.safeParse({
        areaId: "ss2",
        bio: "a".repeat(181),
        visible: true,
      }).success,
    ).toBe(false);
    const settings = nearbySchema.parse({
      areaId: "ss2",
      bio: " Hello ",
      visible: true,
      lat: 3.123456789,
      lng: 101.123456789,
    });
    expect(settings).toEqual({ areaId: "ss2", bio: "Hello", visible: true });
  });
  it("persists opting in and out separately from matching preferences", () => {
    const state = applyDemo(demoState(), "nearby", {
      areaId: "ss2",
      bio: "Weekend doubles?",
      visible: true,
    });
    expect(state.nearbySettings?.visible).toBe(true);
    expect(state.profile).toEqual(profile);
    const hidden = applyDemo(state, "nearby", {
      ...state.nearbySettings,
      visible: false,
    });
    expect(hidden.nearbySettings?.visible).toBe(false);
    expect(hidden.sparks).toEqual(state.sparks);
  });
  it("has supported broad reference points for every profile city", () => {
    expect(new Set(areas.map((area) => area.id)).size).toBe(areas.length);
    for (const area of areas) expect(areaById(area.id)).toEqual(area);
  });
});
