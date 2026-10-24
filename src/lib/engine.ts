import type {
  Action,
  Candidate,
  Proposal,
  Requirement,
  Spark,
  TimeWindow,
} from "./types";

export const SEARCH_LIMIT = 3000;
export const overlaps = (a: TimeWindow, b: TimeWindow) =>
  Date.parse(a.start) < Date.parse(b.end) &&
  Date.parse(b.start) < Date.parse(a.end);
export const contains = (a: TimeWindow, b: TimeWindow) =>
  Date.parse(a.start) <= Date.parse(b.start) &&
  Date.parse(a.end) >= Date.parse(b.end);
const validWindow = (w: TimeWindow) =>
  Number.isFinite(Date.parse(w.start)) &&
  Date.parse(w.end) > Date.parse(w.start);
export function eligible(
  spark: Spark,
  candidate: Candidate,
  window: TimeWindow,
  blocked: string[] = [],
) {
  if (
    !validWindow(window) ||
    !candidate.optedIn ||
    !candidate.approved ||
    blocked.includes(candidate.ownerId)
  )
    return false;
  if (
    ["participant", "tutor", "facilitator"].includes(candidate.kind) &&
    candidate.quantity !== 1
  )
    return false;
  if (spark.city !== candidate.city || candidate.hubId !== spark.hubId)
    return false;
  if (!spark.hubId && candidate.age !== "adult") return false;
  if (
    spark.participantIds.includes(candidate.ownerId) &&
    ["participant", "tutor", "facilitator"].includes(candidate.kind)
  )
    return false;
  return (
    candidate.windows.some((w) => contains(w, window)) &&
    !candidate.reservations.some((w) => overlaps(w, window))
  );
}
type Branch = {
  actions: Action[];
  remaining: Requirement[];
  used: Set<string>;
  cost: number;
  fairness: number;
};
const better = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
};
const requirementLabel = (r: Requirement) =>
  `${r.quantity} ${r.skill ? `${r.skill} ` : ""}${r.kind}${r.quantity > 1 ? "s" : ""}`;

/** Bounded deterministic constraint search. Proposals never create reservations or consent. */
export function unlock(
  spark: Spark,
  pool: Candidate[],
  blocked: string[] = [],
): Proposal {
  const needs = spark.requirements
    .filter((r) => r.quantity > 0)
    .map((r) => ({ ...r }));
  const missingPeople = Math.max(0, spark.target - spark.participantIds.length);
  let participantGap = Math.max(
    0,
    missingPeople -
      needs
        .filter((r) => ["tutor", "facilitator"].includes(r.kind))
        .reduce((n, r) => n + r.quantity, 0),
  );
  for (const need of needs.filter((r) => r.kind === "participant")) {
    need.quantity = Math.min(need.quantity, participantGap);
    participantGap -= need.quantity;
  }
  for (let i = needs.length - 1; i >= 0; i--)
    if (needs[i].quantity === 0) needs.splice(i, 1);
  const specifiedPeople = needs
    .filter((r) => ["participant", "tutor", "facilitator"].includes(r.kind))
    .reduce((n, r) => n + r.quantity, 0);
  if (missingPeople > specifiedPeople)
    needs.unshift({
      id: "additional-people",
      kind: "participant",
      quantity: missingPeople - specifiedPeople,
    });
  const blockers = needs.map(requirementLabel);
  const candidates = [...pool].sort(
    (a, b) =>
      a.commitments - b.commitments ||
      a.cost - b.cost ||
      a.id.localeCompare(b.id),
  );
  let explored = 0,
    truncated = false;
  let best: { branch: Branch; window: TimeWindow; score: number[] } | null =
    null;
  const alternatives: TimeWindow[] = [];
  const windows = spark.windows
    .filter(validWindow)
    .filter((w) => !spark.conflicts?.some((busy) => overlaps(w, busy)))
    .slice(0, 12);
  for (const window of windows) {
    let windowFeasible = false;
    function search(branch: Branch) {
      if (++explored > SEARCH_LIMIT) {
        truncated = true;
        return;
      }
      const remaining = branch.remaining.filter((r) => r.quantity > 0);
      const unresolved = remaining.reduce((s, r) => s + r.quantity, 0);
      const feasible = unresolved === 0;
      const originalResolved = branch.actions
        .filter((a) => needs.some((r) => r.kind === a.kind))
        .reduce((n, a) => n + a.quantity, 0);
      const score = [
        feasible ? 1 : 0,
        -unresolved,
        feasible ? 0 : originalResolved,
        -branch.actions.length,
        -branch.cost,
        -branch.fairness,
      ];
      if (!best || better(score, best.score))
        best = { branch: { ...branch, remaining }, window, score };
      if (feasible) {
        windowFeasible = true;
        return;
      }
      const [need, ...rest] = remaining;
      const matches = candidates.filter(
        (c) =>
          c.quantity >
            branch.actions
              .filter((a) => a.candidateId === c.id)
              .reduce((n, a) => n + a.quantity, 0) &&
          c.kind === need.kind &&
          (!need.skill || c.skills.includes(need.skill)) &&
          c.capacity >= (need.capacity ?? 0) &&
          c.quantity > 0 &&
          eligible(spark, c, window, blocked),
      );
      for (const c of matches) {
        const existing = branch.actions.find((a) => a.candidateId === c.id);
        if (branch.cost + (existing ? 0 : c.cost) > spark.budget) continue;
        if (
          ["participant", "tutor", "facilitator"].includes(c.kind) &&
          branch.actions.some(
            (a) =>
              a.ownerId === c.ownerId &&
              ["participant", "tutor", "facilitator"].includes(a.kind),
          )
        )
          continue;
        const quantity = Math.min(
          need.quantity,
          c.quantity - (existing?.quantity ?? 0),
        );
        const used = new Set(branch.used);
        used.add(c.id);
        const dependencies = (existing ? [] : c.needs).map((r) => ({
          ...r,
          id: `${c.id}-${r.id}`,
        }));
        const action: Action = {
          id: `${spark.id}-${c.id}`,
          candidateId: c.id,
          ownerId: c.ownerId,
          label: c.label,
          kind: c.kind,
          quantity: quantity + (existing?.quantity ?? 0),
          cost: c.cost,
          state: "pending",
          explanation: `${c.label} meets ${quantity} ${need.kind} requirement${quantity > 1 ? "s" : ""}${need.skill ? ` with ${need.skill} expertise` : ""}. Available for the full session in ${spark.city}; ${c.needs.length ? "dependent resources are included in this search" : "no additional resources needed"}. Explicit approval is still required.`,
        };
        search({
          actions: existing
            ? branch.actions.map((a) =>
                a.candidateId === c.id
                  ? {
                      ...action,
                      explanation: `${c.label} provides ${action.quantity} ${c.kind} units across the combined requirements. Available for the full session; explicit owner approval is required.`,
                    }
                  : a,
              )
            : [...branch.actions, action],
          remaining: [
            { ...need, quantity: need.quantity - quantity },
            ...rest,
            ...dependencies,
          ],
          used,
          cost: branch.cost + (existing ? 0 : c.cost),
          fairness: branch.fairness + (existing ? 0 : c.commitments),
        });
        if (truncated) break;
      }
      // Continue past an unsatisfied requirement to provide useful partial matches.
      if (matches.length === 0 && rest.length) {
        for (const next of rest) {
          const c = candidates.find(
            (c) =>
              !branch.used.has(c.id) &&
              c.kind === next.kind &&
              (!next.skill || c.skills.includes(next.skill)) &&
              c.capacity >= (next.capacity ?? 0) &&
              c.quantity > 0 &&
              !c.needs.length &&
              branch.cost + c.cost <= spark.budget &&
              eligible(spark, c, window, blocked),
          );
          if (c) {
            const quantity = Math.min(next.quantity, c.quantity);
            const used = new Set(branch.used);
            used.add(c.id);
            const action: Action = {
              id: `${spark.id}-${c.id}`,
              candidateId: c.id,
              ownerId: c.ownerId,
              label: c.label,
              kind: c.kind,
              quantity,
              cost: c.cost,
              state: "pending",
              explanation: `${c.label} can resolve this ${next.kind} requirement. Other blockers remain; approval is required.`,
            };
            search({
              ...branch,
              actions: [...branch.actions, action],
              remaining: remaining.map((r) =>
                r.id === next.id
                  ? { ...r, quantity: r.quantity - quantity }
                  : r,
              ),
              used,
              cost: branch.cost + c.cost,
            });
            break;
          }
        }
      }
    }
    search({
      actions: [],
      remaining: needs.map((r) => ({ ...r })),
      used: new Set(),
      cost: 0,
      fairness: 0,
    });
    if (windowFeasible) alternatives.push(window);
    if (truncated) break;
  }
  // TS control flow does not infer assignments inside recursive search.
  const selected = best as {
    branch: Branch;
    window: TimeWindow;
    score: number[];
  } | null;
  const actions = selected?.branch.actions ?? [];
  const remaining = selected?.branch.remaining ?? needs;
  const baselineKinds = new Set<Requirement["kind"]>(["participant"]);
  const baselineResolved = needs
    .filter((r) => baselineKinds.has(r.kind))
    .reduce(
      (n, r) =>
        n +
        Math.min(
          r.quantity,
          candidates
            .filter(
              (c) =>
                c.kind === r.kind &&
                !c.needs.length &&
                (!r.skill || c.skills.includes(r.skill)) &&
                windows[0] &&
                eligible(spark, c, windows[0], blocked),
            )
            .reduce((s, c) => s + c.quantity, 0),
        ),
      0,
    );
  return {
    id: `proposal-${spark.id}`,
    sparkId: spark.id,
    window: selected?.window ?? null,
    blockers,
    remainingBlockers: remaining.map(requirementLabel),
    actions,
    feasible: !!selected && remaining.length === 0,
    explored: Math.min(explored, SEARCH_LIMIT),
    truncated,
    alternatives,
    baselineResolved,
    resolved: actions.reduce((s, a) => s + a.quantity, 0),
    commitments: actions.length,
    cost: selected?.branch.cost ?? 0,
    score: selected?.score ?? [],
    createdAt: new Date().toISOString(),
  };
}

/** Portfolio beam search: maximize activities, then people, then reduce commitments and costs. */
export function unlockPortfolio(
  sparks: Spark[],
  pool: Candidate[],
  blocked: string[] = [],
  declines: { sparkId: string; candidateId: string }[] = [],
) {
  type Plan = {
    proposals: Proposal[];
    pool: Candidate[];
    score: number[];
    people: { userId: string; window: TimeWindow }[];
  };
  let beam: Plan[] = [
    {
      proposals: [],
      pool: structuredClone(pool),
      score: [0, 0, 0, 0],
      people: [],
    },
  ];
  const ordered = [...sparks]
    .filter((s) => !["DRAFT", "COMPLETED", "CANCELLED", "CONFIRMED"].includes(s.status))
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
  for (const spark of ordered.slice(0, 20)) {
    const expanded: Plan[] = [];
    for (const plan of beam) {
      expanded.push(plan);
      // Try each supplied schedule, avoiding shared people and resource clashes.
      for (const window of spark.windows.slice(0, 12)) {
        if (
          spark.participantIds.some((userId) =>
            plan.people.some(
              (p) => p.userId === userId && overlaps(p.window, window),
            ),
          )
        )
          continue;
        const proposal = unlock(
          { ...spark, windows: [window] },
          plan.pool.filter(
            (c) =>
              !declines.some(
                (d) => d.sparkId === spark.id && d.candidateId === c.id,
              ),
          ),
          blocked,
        );
        if (!proposal.feasible) continue;
        const people = proposal.actions.filter((a) =>
          ["participant", "tutor", "facilitator"].includes(a.kind),
        ).length;
        expanded.push({
          proposals: [...plan.proposals, proposal],
          people: [
            ...plan.people,
            ...[
              ...spark.participantIds,
              ...proposal.actions
                .filter((a) =>
                  ["participant", "tutor", "facilitator"].includes(a.kind),
                )
                .map((a) => a.ownerId),
            ].map((userId) => ({ userId, window })),
          ],
          pool: plan.pool.map((c) =>
            proposal.actions.some(
              (a) =>
                a.candidateId === c.id ||
                (["participant", "tutor", "facilitator"].includes(a.kind) &&
                  a.ownerId === c.ownerId &&
                  ["participant", "tutor", "facilitator"].includes(c.kind)),
            ) ||
            (spark.participantIds.includes(c.ownerId) &&
              ["participant", "tutor", "facilitator"].includes(c.kind))
              ? { ...c, reservations: [...c.reservations, window] }
              : c,
          ),
          score: [
            plan.score[0] + 1,
            plan.score[1] + spark.participantIds.length + people,
            plan.score[2] - proposal.commitments,
            plan.score[3] - proposal.cost,
          ],
        });
      }
    }
    beam = expanded
      .sort((a, b) =>
        better(a.score, b.score) ? -1 : better(b.score, a.score) ? 1 : 0,
      )
      .slice(0, 32);
  }
  return {
    proposals: beam[0].proposals,
    score: beam[0].score,
    bounded: true as const,
  };
}

export function canConfirm(proposal: Proposal) {
  return (
    proposal.feasible &&
    proposal.actions.every((a) => a.state === "accepted") &&
    !!proposal.window
  );
}
