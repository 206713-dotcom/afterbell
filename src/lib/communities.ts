import type { AppState, Hub, HubKind, ImpactMetrics, Spark } from "./types";
import { accessibleSparks } from "./discovery";
export const hubKinds: Record<HubKind, string> = {
  school: "School",
  university: "University",
  club: "Club",
  organization: "Organization",
  community: "Community group",
};
export const cityStates: Record<string, string> = {
  "Petaling Jaya": "Selangor",
  "Shah Alam": "Selangor",
  "Subang Jaya": "Selangor",
  Klang: "Selangor",
  Puchong: "Selangor",
  Cheras: "Selangor",
  "Seri Kembangan": "Selangor",
  Rawang: "Selangor",
  Ampang: "Selangor",
  Cyberjaya: "Selangor",
  Kajang: "Selangor",
  Semenyih: "Selangor",
  "Sungai Buloh": "Selangor",
  Banting: "Selangor",
  "Batang Kali": "Selangor",
  "Tanjong Malim": "Perak",
  "Bandar Baru Bangi": "Selangor",
  "Tanjong Karang": "Selangor",
  "Kuala Lumpur": "Kuala Lumpur",
  "George Town": "Penang",
  "Johor Bahru": "Johor",
  Ipoh: "Perak",
  "Kota Kinabalu": "Sabah",
  Kuching: "Sarawak",
  Melaka: "Melaka",
  Seremban: "Negeri Sembilan",
  Kuantan: "Pahang",
  "Alor Setar": "Kedah",
  "Kuala Terengganu": "Terengganu",
  "Kota Bharu": "Kelantan",
  Kangar: "Perlis",
  Putrajaya: "Putrajaya",
  Labuan: "Labuan",
};
export const academicLevels = [
  "General learning",
  "Primary",
  "Lower secondary",
  "SPM",
  "IGCSE",
  "A-Level",
  "STPM",
  "University",
] as const;
export function canReadHub(state: AppState, hub: Hub) {
  return (
    (state.joined.includes(hub.id) &&
      (state.profile.age === "adult" || (hub.approved && hub.youthApproved))) ||
    (state.profile.age === "adult" &&
      ((hub.visibility === "public" && hub.approved) || hub.admin === true))
  );
}
export function canReadSpark(state: AppState, spark: Spark) {
  if (state.blocked.includes(spark.ownerId)) return false;
  if (spark.status === "DRAFT" && spark.ownerId !== state.profile.id)
    return false;
  if (!spark.hubId) return state.profile.age === "adult";
  const hub = state.hubs.find((h) => h.id === spark.hubId);
  return !!hub && canReadHub(state, hub);
}
export function demoImpact(state: AppState): ImpactMetrics {
  const sparks = accessibleSparks(state);
  const ids = new Set(sparks.map((s) => s.id));
  const proposals = state.proposals.filter(
    (p) => ids.has(p.sparkId) && p.feasible,
  );
  const registered = new Set([
    state.profile.id,
    ...(state.hubMembers ?? [])
      .filter(
        (m) =>
          m.status === "approved" &&
          (state.profile.age === "adult"
            ? m.age === "adult" || state.joined.includes(m.hubId)
            : state.joined.includes(m.hubId)),
      )
      .map((m) => m.userId),
  ]);
  const participants = new Set(
    sparks
      .filter((s) => ["CONFIRMED", "COMPLETED"].includes(s.status))
      .flatMap((s) => s.participantIds),
  );
  const youth = new Set(
    (state.hubMembers ?? [])
      .filter((m) => m.age === "youth")
      .map((m) => m.userId),
  );
  if (state.profile.age === "youth") youth.add(state.profile.id);
  return {
    registered: registered.size,
    sparksCreated: sparks.length,
    unlocked: proposals.length,
    confirmed: sparks.filter((s) => s.status === "CONFIRMED").length,
    completed: sparks.filter((s) => s.status === "COMPLETED").length,
    participatingAdults: [...participants].filter((id) => !youth.has(id))
      .length,
    participatingStudents: [...participants].filter((id) => youth.has(id))
      .length,
    resolved: proposals.reduce((n, p) => n + p.resolved, 0),
    baseline: proposals.reduce((n, p) => n + p.baselineResolved, 0),
  };
}
