import type { AppState, Category, Profile, Spark, TimeWindow } from "./types";

export type DiscoveryFilters = {
  category: Category | "all";
  query: string;
  city: string;
  saved: boolean;
  date: string;
  time: "any" | "morning" | "afternoon" | "evening";
  needsPeople: boolean;
  sort: "recommended" | "soonest" | "spaces";
};

// Fixed to MYT, so discovery does not change when the visitor travels.
export function slotDetails(window: TimeWindow) {
  const start = new Date(Date.parse(window.start) + 8 * 60 * 60 * 1000);
  const hour = start.getUTCHours();
  return {
    date: start.toISOString().slice(0, 10),
    period: hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening",
    weekend: [0, 6].includes(start.getUTCDay()),
  };
}

export function matchesWindow(
  window: TimeWindow,
  filters: Pick<DiscoveryFilters, "date" | "time">,
) {
  const slot = slotDetails(window);
  return (
    (!filters.date || slot.date === filters.date) &&
    (filters.time === "any" || slot.period === filters.time)
  );
}

export function accessibleSparks(state: AppState) {
  return state.sparks.filter((spark) => {
    if (
      ["DRAFT", "CANCELLED"].includes(spark.status) ||
      state.blocked.includes(spark.ownerId)
    )
      return false;
    const hub = state.hubs.find((h) => h.id === spark.hubId);
    if (hub?.visibility === "private" && !state.joined.includes(hub.id))
      return false;
    return (
      state.profile.age === "adult" ||
      !!(hub?.approved && hub.youthApproved && state.joined.includes(hub.id))
    );
  });
}

export function matchReasons(spark: Spark, profile: Profile) {
  const reasons: string[] = [];
  if (spark.city === profile.city) reasons.push("In your city");
  if (
    profile.interests.some(
      (interest) => interest.toLowerCase() === spark.category,
    )
  )
    reasons.push("Your kind of thing");
  const text =
    `${spark.title} ${spark.description} ${spark.skill}`.toLowerCase();
  if (profile.subjects.some((subject) => text.includes(subject.toLowerCase())))
    reasons.push("Matches your subjects");
  if (
    spark.windows.some((w) => {
      const slot = slotDetails(w);
      return profile.availability.some(
        (a) =>
          a.toLowerCase() ===
          `${slot.weekend ? "weekend" : "weekday"} ${slot.period}s`,
      );
    })
  )
    reasons.push("Fits your usual availability");
  return reasons;
}

export function discover(state: AppState, filters: DiscoveryFilters) {
  const query = filters.query.trim().toLowerCase();
  const results = accessibleSparks(state).filter(
    (spark) =>
      (filters.category === "all" || spark.category === filters.category) &&
      (filters.city === "all" || spark.city === filters.city) &&
      (!filters.saved || state.saved.includes(spark.id)) &&
      (!filters.needsPeople ||
        (spark.participantIds.length < spark.target &&
          !["CONFIRMED", "COMPLETED"].includes(spark.status))) &&
      `${spark.title} ${spark.description} ${spark.skill} ${spark.city}`
        .toLowerCase()
        .includes(query) &&
      spark.windows.some((window) => matchesWindow(window, filters)),
  );
  const earliest = (spark: Spark) =>
    Math.min(
      ...spark.windows
        .filter((window) => matchesWindow(window, filters))
        .map((w) => Date.parse(w.start)),
    );
  return results.sort((a, b) => {
    if (filters.sort === "spaces")
      return (
        Math.max(0, b.target - b.participantIds.length) -
          Math.max(0, a.target - a.participantIds.length) ||
        earliest(a) - earliest(b) ||
        a.id.localeCompare(b.id)
      );
    if (filters.sort === "recommended") {
      const score = (spark: Spark) =>
        matchReasons(spark, state.profile).reduce(
          (total, reason) => total + (reason === "In your city" ? 4 : 1),
          0,
        );
      const difference = score(b) - score(a);
      if (difference) return difference;
    }
    return earliest(a) - earliest(b) || a.id.localeCompare(b.id);
  });
}
