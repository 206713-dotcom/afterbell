# Original prompt completion audit

Source: the user’s original AFTERBELL prompt, reread in full. Completion pass updated 22 October 2026.

The work below is implemented. Persistent individual local accounts additionally make the running unconfigured installation support sign-up, sign-in, logout, recovery and independent account data. Hosted Supabase remains configurable. Evidence: 109 unit/database tests and 40 production browser cases across desktop/mobile. See [verification](VERIFICATION.md) and [accounts](ACCOUNTS.md).

| Area                | Existing foundation                                                                   | Completion work in this pass                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Routes and design   | All requested routes, responsive design, accessible dialogs and forms                 | Community workspace navigation and school-specific pages                                                      |
| Accounts            | Supabase Auth, verification, reset, OAuth flag, protected routes                      | Keep live configuration limitation explicit; extend preferences                                               |
| Public communities  | Browse city, join requests, admin approvals                                           | State/activity/type filters and distinct personal/public views                                                |
| Private communities | Invite redemption and membership approval                                             | Multiple school/org communities, scoped directory, member roles, invite management and participation controls |
| Privacy             | RLS, own-row private profiles, adult/youth separation, blocks/reports                 | Opt-in directory fields visible only to approved community members; negative authorization tests              |
| Sparks              | Persistent create/edit/delete and lifecycle gates                                     | Save/publish drafts, school preselection, academic subject/level/goals, singles/doubles and venue fields      |
| UNLOCK              | Deterministic bounded solver, dependencies, costs, scheduling, portfolio allocation   | Exercise facilitator/room school workshop and ensure human facilitator conflict handling                      |
| UNLOCK Lab          | Interactive graph, individual consent states, real scenarios, comparison, experiments | Include school workshop and expose community scope                                                            |
| Study/tutoring      | Study/tutor categories, approved private-hub tutors                                   | Academic filters and structured learning goals; no professional-verification claim                            |
| Badminton           | Skill, participant targets, replacements, sourced court directory                     | Explicit singles/doubles and Leaflet/OpenStreetMap court map                                                  |
| Group rooms         | Approvals, reservations, attendance, completion, cancellation/replacement             | Preserve and regression-test school-isolated flows                                                            |
| Impact              | Actual Sparks/proposals/confirmed/completed chart                                     | Registered eligible members, adult/student participation, resolved requirements, before/after computation     |
| Database            | Authenticated checked RPCs, RLS, constraints, audit trail                             | Additive migration for community controls and structured activity fields                                      |
| Demo                | Actual solver with clearly fictional data                                             | Multiple separate school/club memberships and independent activity feeds                                      |
| Verification        | Solver/database/browser tests and accessibility scans                                 | Add coverage for school isolation, roles, directories, drafts, category fields and metrics                    |
| Delivery            | README, env example, Vercel guide, algorithm/security docs, assistance disclosure     | Update schema/setup/demo/verification documentation and record evidence                                       |

Optional/future-only items in the prompt remain clearly distinguished: professional tutor verification, payments, live court booking and global optimization proofs are not claimed. Hosted Supabase, SMTP/OAuth and deployment require external configuration; the prompt explicitly permits the tested local demo plus integration code and migrations when credentials are absent.
