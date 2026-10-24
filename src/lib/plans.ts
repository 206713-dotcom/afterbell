import { accessibleSparks } from "./discovery";
import { canReadSpark } from "./communities";
import type { AppState, Spark } from "./types";

export const planViews = [
  "active",
  "confirmed",
  "drafts",
  "saved",
  "past",
] as const;
export type PlanView = (typeof planViews)[number];
export const planLabels: Record<PlanView, string> = {
  active: "All active",
  confirmed: "Confirmed",
  drafts: "Drafts",
  saved: "Saved",
  past: "Past plans",
};

export function personalPlans(state: AppState, view: PlanView) {
  const visible = accessibleSparks(state);
  if (view === "saved")
    return visible.filter((s) => state.saved.includes(s.id));
  if (view === "drafts")
    return state.sparks.filter(
      (s) =>
        s.ownerId === state.profile.id &&
        s.status === "DRAFT" &&
        canReadSpark(state, s),
    );
  const history = state.sparks.filter(
    (s) => s.status === "CANCELLED" && canReadSpark(state, s),
  );
  return [...visible, ...history].filter((spark) => {
    const involved =
      spark.ownerId === state.profile.id ||
      spark.participantIds.includes(state.profile.id) ||
      state.proposals.some(
        (p) =>
          p.sparkId === spark.id &&
          p.actions.some(
            (a) => a.ownerId === state.profile.id && a.state !== "declined",
          ),
      );
    if (!involved) return false;
    if (view === "confirmed") return spark.status === "CONFIRMED";
    if (view === "past")
      return ["COMPLETED", "CANCELLED"].includes(spark.status);
    return !["COMPLETED", "CANCELLED"].includes(spark.status);
  });
}

export function planWindow(state: AppState, spark: Spark) {
  return (
    state.proposals.find((p) => p.sparkId === spark.id)?.window ??
    spark.windows[0]
  );
}

export function planHref(state: AppState, spark: Spark) {
  if (spark.status === "DRAFT") return `/sparks/${spark.id}/edit`;
  return state.proposals.some((p) => p.sparkId === spark.id) &&
    ["AWAITING_CONFIRMATION", "CONFIRMED", "COMPLETED"].includes(spark.status)
    ? `/groups/${spark.id}`
    : `/sparks/${spark.id}`;
}
