# The UNLOCK Engine

UNLOCK differs from discovery by solving dependencies. Discovery can tell you who likes badminton. UNLOCK can find a compatible fourth player, notice that they need a racket, include an available opted-in racket owner, and choose a shared interval. It explains these commitments as a proposal rather than treating a match as confirmed participation.

## Inputs and constraints

The same pure TypeScript module, `src/lib/engine.ts`, is used for fictional demos and the authenticated live server. Inputs are authorized Sparks, explicit offers, capacities, expertise, available intervals, existing reservations, current participants, and block/decline exclusions. Database RLS and helpers enforce hub membership, school approval and tutor permissions before and after computation.

Hard filters require opt-in and approval, exact hub scope, broad city compatibility, public adult eligibility, skill compatibility, sufficient capacity, full-interval availability and no conflicting reservations. One person can supply only one participation unit and cannot count twice through multiple offers. Resources can provide multiple units to the same activity up to their stated quantity; their cost is charged once per exclusive offer commitment.

Existing accepted participants reduce the current participation gap. Busy existing participants eliminate conflicting supplied activity windows. The portfolio checks both original participants and proposed invitees, so an otherwise different resource cannot hide a shared-person conflict.

## Search and prioritization

For each of up to 12 supplied windows, a deterministic depth-first candidate search:

1. Selects an unsatisfied requirement.
2. Filters candidates against hard constraints.
3. Allocates the required quantity, adding that candidate's dependencies once.
4. Tracks consumed units, unique people, cost, commitments and prior-use counts.
5. Recurses until all requirements are met or the 3,000-state bound is reached.

Candidates are stably ordered by prior commitments, then cost, then ID. Solutions compare lexicographically: feasibility; fewer unresolved units; useful partial coverage for blocked plans; fewer distinct commitments; lower cost; then fewer prior commitments. Partial matches retain their unresolved dependencies. Fairness is a simple prior-use tie-breaker, not a fairness guarantee across a population.

The portfolio search keeps 32 candidate plans while considering at most 20 open Sparks ordered by creation time then ID. For each supplied window, it tries adding the feasible activity, temporarily excludes overlapping shared offers and people, and compares total feasible activities, total participations, fewer commitments and lower cost. Skipping an activity is a valid branch. These temporary allocations are hypothetical and never create database reservations.

## Output

The result includes original blockers, proposed actions, explanations, unresolved requirements, selected and alternative feasible windows, cost, commitment count, explored states and whether the bound was reached. `feasible=true` means the supplied authorized inputs admit the proposed combination; it supplies no consent. The database independently checks a saved feasible flag and revalidates again before confirmation.

The network uses unresolved, proposed and confirmed labels as well as red/amber/green cues. A computed shared time or owner offer is still shown as proposed until approval and session confirmation.

## Baseline

The comparison baseline looks for eligible, dependency-free participation offers at the original supplied time. It does not search equipment/room dependencies or alternative schedules. Both counts use the same input data. The comparison measures proposed commitment units found; it is not an outcome improvement, causal impact study, or claim that UNLOCK always beats every other algorithm.

## Limits

- This is **bounded deterministic search**, not a global optimization proof. Beam pruning, candidate ordering and search limits can omit a better or feasible solution.
- The engine only searches supplied intervals. It does not invent free time, subdivide arbitrary calendars, infer permission, or assume explicit acceptance.
- Broad cities use exact matching. No travel-time model, geocoding or precise-user-location matching is included.
- Offer quantity is conservative: a confirmed offer is exclusive for the entire session, even if unused units remain. The same physical projector can be reused in nonoverlapping sessions.
- Expertise and general experience are self-reported; private peer tutor approval is an actual database-controlled hub decision. There is no professional tutor verification service.
- Inputs can change after a proposal. Confirmation is transactional and can reject stale availability or permission. A rejection requires a fresh analysis and fresh responses.
- A declined offer is excluded for that Spark; reissuing the same activity does not override refusal. A participant can withdraw from a confirmed session, which becomes blocked until replacement approvals are collected.
- Portfolio fairness uses oldest-activity order for deterministic ties. It does not guarantee demographic or long-term allocation fairness.

See `tests/engine.test.ts` for dependencies, quantities, schedules, capacity, skills, consent, safety, budget, deterministic order, bounded behavior and multi-activity conflicts.
