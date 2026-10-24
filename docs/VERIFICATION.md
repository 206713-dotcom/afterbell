# Verification record

This file records implementation verification updated **23 October 2026**. The test suites themselves are the source of truth; rerun them after changes.

## Implemented user story

A member creates a Spark → authorized inputs reach the actual solver → a proposal is stored → individual invitations receive consent → the organizer confirms → PostgreSQL reserves people/resources and records the session → the interface and metrics reflect the stored result.

## Evidence and limits

Final validation passed: **141 Vitest tests, 60 Playwright cases across desktop/mobile against an isolated production build, lint and strict type checking.** Browser coverage includes individual accounts, shared school chat, reciprocal connections, private messages, blocking, places and recorded booking details, global search, reloadable filters/conversations, account recovery, stale-response protection, tab-local chat drafts, reading-position preservation and current activity defaults, plus the existing UNLOCK, consent and reservation flows. The production build also verifies that local account/test data and private environment files are excluded from deployment traces.

That is the latest full functional baseline. The subsequent text/typography pass ran **14 targeted desktop/mobile browser cases**, lint, strict TypeScript and a production build, plus the visual checks recorded below; it changed presentation and wording only.

| Boundary                         | Evidence                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI and routing                   | Desktop and mobile Playwright tests cover landing/demo entry, requested routes, discovery, Spark CRUD and reload persistence.                                                                                                                                                                                                      |
| Client → authenticated API       | Browser tests verify live endpoints reject a demo cookie and reject cross-origin mutations.                                                                                                                                                                                                                                        |
| Solver                           | Vitest exercises real deterministic matching, dependencies, alternative slots, quantities/capacity, conflicts, consent, budget, safety, search bounds and portfolio allocation.                                                                                                                                                    |
| API data/permissions model       | The full migration runs in embedded PostgreSQL (PGlite) with modeled Supabase auth identity and roles. Negative RLS/role/ownership cases and positive transactions execute against it.                                                                                                                                             |
| Proposal → consent → reservation | A database test creates an offer, computes a real solver proposal, sends invitations, responds as the resource/participant owner, confirms as organizer, and checks reservations, attendance and completion.                                                                                                                       |
| Stale/forged/cancelled state     | Tests reject forged feasibility, other-user acceptance, missing consent, withdrawn opt-in and overlapping reservations. Withdrawal and cancellation release reservations.                                                                                                                                                          |
| Accessibility                    | Axe scans representative landing, dashboard, login, Spark creation and UNLOCK pages for WCAG 2 A/AA, 2.1 AA and 2.2 AA rule tags. Browser tests check responsive overflow. Native dialogs, keyboard controls, focus styles and reduced-motion support are implemented. Automated coverage is not a full human accessibility audit. |
| Production bundle                | `npm run build` uses supported Next.js Webpack after a Windows Turbopack worker initialization failure; build and TypeScript checks must pass before handoff.                                                                                                                                                                      |
| Live Supabase                    | **Not tested**: project credentials were absent. Real hosted Auth, email delivery, project grants/PostgREST behavior, OAuth and network connectivity still need staging verification.                                                                                                                                              |
| Hosting                          | **Not deployed**. Vercel instructions and environment template are included.                                                                                                                                                                                                                                                       |
| Venues                           | 43 badminton and 12 study listings with primary source links; real AFA calendars embedded on demand, external operator arrangements elsewhere. No AfterBell availability sync or payment collection.                                                                                                                               |

The fictional demo and the PostgreSQL tests have separate persistence. Browser simulator controls do not prove real-user authorization by themselves; database tests exercise that boundary explicitly. There are no fabricated production accounts or impact results.

Commands: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. Playwright screenshots and accessibility diagnostics are kept under ignored `.local/`; failure traces are under ignored `test-results/`.

## Nearby feature verification

The nearby extension is included in the counts above. Database cases cover opt-in/out, first-name-only safe-field projection, private row reads, both-sided blocks, adult eligibility, owner spoofing, unsupported areas and direct RPC validation. Browser cases use synthetic device positions, verify explicit permission requests and denial fallback, check that precise coordinates never enter browser storage or API requests, and exercise profiles, filters, nearby Sparks, blocking, persistence and responsive accessibility. The production smoke also checks that the map URL contains only a broad area reference and that a demo cookie cannot read the live nearby API. See [nearby implementation and limitations](NEARBY.md).

## Individual accounts and community extension

The browser suite covers signup, onboarding, UI logout, password sign-in, recovery/key rotation, persistence, drafts/publication, cookie flags, school switching and directory privacy, plus the existing UNLOCK and session flows. It builds `.next-test` and uses port 3100 and `.local/browser-accounts`, separate from normal accounts. Temporary SQLite tests verify hashed credentials, incorrect-password rejection, session revocation, reopen persistence, private-school isolation, role escalation/owner safeguards, participation approval, both-sided blocks and cross-account consent/reservations. PostgreSQL tests apply all five migrations and exercise scoped directories/roles/workspace/drafts and facilitator confirmation.

Hosted Supabase Auth, SMTP, OAuth and PostgREST connectivity remain untested without project credentials. Local accounts make no email-verification claim.

Vitest was updated to remove a critical development advisory. Five high development-only transitive advisories remain in the Next ESLint glob chain (`braces` 3.0.3); the registry still offers no newer patched braces release. The suggested forced fix incompatibly downgrades Next’s ESLint configuration and was not applied. Rerun `npm audit` when patches become available; no clean audit is claimed.

A separate development smoke verified account persistence with zero automatic page reloads after database writes, no page errors, and a clean accessibility scan of the school member directory. Desktop and mobile sign-up screenshots were inspected. The build applies private-data exclusions to deployment trace manifests and verifies that local databases/test records and private environment files are excluded, including a Windows path-normalization workaround.

## Visual refresh

The visual refresh adds locally served DM Sans/Instrument Serif (OFL licenses included), shared colour/typography/spacing rules in `src/app/refresh.css`, revised landing/auth/community copy, dashboard quick-start links and drafts after active plans, more readable cards/forms, friendly activity status labels, and responsive breakpoints. Screenshot and automated accessibility review covered landing, registration, dashboard, discovery and community listing at desktop, mobile and tablet widths: 15 page/viewport combinations had no overflow, page exceptions or automated WCAG 2 A/AA and 2.1 AA findings. These checks are not a full accessibility certification.

## Navigation and personal plans

Home prioritizes pending decisions and personal plans, with category shortcuts and joined communities. The sidebar uses Home, Explore, My plans and Communities; mobile keeps these destinations and Create in a persistent bottom bar. The full menu uses a native modal dialog for focus containment, Escape and focus restoration. Breadcrumbs display the current community or activity and link to its parent. Search works across accessible activities, community metadata and app destinations, supports Ctrl/Cmd+K, and explicitly focuses its input after opening.

`/plans` includes all matching records in active, confirmed, draft, saved and past folders, with title/city search and URL-based folder selection. Draft rows open the editor, whose primary action explicitly says Publish Spark; Save draft stays private. Personal folders preserve activity access checks, participation and non-declined invitation state. `/impact` now holds the complete metrics and comparison chart.

Screenshot and automated WCAG 2 A/AA, 2.1 AA and 2.2 AA review covered 22 desktop/mobile/tablet page or dialog combinations, with no page exceptions, overflow or findings after contrast fixes. Additional checks covered eight routes at widths 320, 600, 760, 780 and 1024 with no horizontal overflow. New browser flows exercise full plan lists, draft editing, saved activity persistence, folder selection, global search, named breadcrumbs, mobile navigation, Escape and focus restoration.

The final full browser run passed all 46 desktop/mobile cases. Lint, strict type checking and all 123 unit/database tests passed.

## Places, school chat and connections

The extension adds 43 badminton centres and 12 study spaces, with source links reviewed on 22 October 2026. Manual browser verification opened New Vision's real AFA scheduler inside an AfterBell dialog and confirmed its numbered court/time grid. No reservation or payment was submitted. Other provider calendars are source-backed links, not a claim that every provider checkout was exercised. AfterBell does not synchronize provider inventory, prices or confirmations.

New SQLite and PostgreSQL cases verify recipient-only friend acceptance, server-derived authorship, third-party isolation, blocked conversations, membership approval/removal, moderated message removal, youth-school restrictions, direct-write/anonymous rejection and organizer-only booking references. The PostgreSQL suite applies all five ordered migrations, including the expanded city constraints.

Browser flows select a real directory entry, preserve court/booking fields through draft/reload, search study spaces, select a fictional school and use its shared chat, keep pending members out, and exchange messages between separate real test accounts before blocking. These account tests use the isolated test database. The demo remains fictional and browser-local.

A separate screenshot and automated WCAG review covered 21 desktop/mobile/tablet page or dialog combinations: courts, study spaces, schools, adult chat, school chat, the court form and its picker. After contrast and responsive header fixes there were no page exceptions, horizontal overflow or automated findings. A final full browser run passed 46/46 cases, including scans after navigating and scrolling.

## Editorial design refinement

The welcome page now uses a custom code-native badminton/study illustration, deeper forest and ivory colours, an editorial serif accent and a focused account form. Login, registration, recovery, password visibility, account feedback and demo entry keep their existing account behavior. Mode buttons disable while a request is in progress, and password visibility exposes its pressed state to assistive technology. The illustration represents the product's activities, with no invented bookings, availability or member records.

The workspace shares calmer cards, clearer active navigation, more consistent page headings and spacing, and revised home/community copy. Screenshot and automated WCAG 2 A/AA, 2.1 AA and 2.2 AA review covered login, registration, recovery, landing, home, places, schools and conversations at desktop, mobile and tablet widths: 24 combinations with no page errors, horizontal overflow or automated findings after the home footer contrast correction. Font files remain self-hosted, and the welcome illustration adds no remote asset request. Reduced-motion styles suppress decorative hover movement.

The finished design passed all 46 desktop/mobile browser tests, lint, strict TypeScript validation and the production build privacy check. A production smoke reviewed sign-in at widths 320, 390, 600, 900, 1024 and 1440, checked password visibility and registration/recovery navigation, and found no page errors, horizontal overflow or automated accessibility findings.

## Workspace navigation and account recovery

Global search now finds listed venues and eligible accepted connections. Incoming friend requests appear in Home's next steps, navigation and notifications, with a direct Requests link. Venue filters/selection, school search, connection tabs and conversations persist through URL state; place cards also open provider booking options directly. Youth search results select an approved shared community for group chat. Search and booking dialogs are centered explicitly after the CSS reset, with the mobile search placed near the top for easier use.

Account reads coalesce overlapping requests and invalidate older responses when mutations begin. Initial failures offer retry; subsequent failures preserve the last loaded account with a stale-data banner. A current 401 clears private client state and offers sign-in. Visible-page focus and periodic refresh keep requests current without treating browser cache as authoritative.

Seven added unit cases cover search scope, private drafts/communities, blocked and accepted connections, youth chat destinations, request eligibility and encoded venue links. Eight added desktop/mobile browser cases cover venue/connection search, filter and conversation reloads, history navigation, request reminders and acceptance, school search, initial 503/retry, cached data during 503, session-expiry clearing and a deliberately delayed pre-save response. These failure responses are intercepted in isolated test sessions; profile saves and canonical reads use the actual local account API and test database.

The final full run passed **54/54 browser cases** and **130/130 unit/database tests**. Lint, strict TypeScript, production build and private-data trace checks passed. Screenshot and automated WCAG 2 A/AA, 2.1 AA and 2.2 AA review covered 18 desktop/mobile/tablet views, with no exceptions, horizontal overflow or findings after the contrast fix. Recovery screens, stale-data banners and session expiry also passed automated scans. A final production smoke verified venue search/selection/reload and centered search on desktop and phone, with no errors, overflow or automated findings. Hosted Supabase connectivity remains untested without credentials.

## Conversation usability and activity defaults

The connection inbox now searches names/cities, sorts recent conversations first and shows last-message previews/dates. Youth connections remain shared-school destinations without private-message previews. Mobile conversation selection scrolls to the chat, with an All connections control to return. New incoming messages preserve an older reading position and offer Jump to latest. Composer drafts are scoped by actor, mode and conversation in this tab's session storage; sending, discard, identity changes, detected expiry or lost access clear the applicable data. Failed sends retain the draft. Drafts are limited to 1,500 characters and expire after 24 hours without editing; unavailable storage is handled without blocking composition. These are browser drafts, with no server draft sync or read-receipt claim.

Activity creation now carries the category from discovery/deep links, respects a selected venue's category and sets new account plans to tomorrow in Malaysia. Existing saved dates remain intact, and demo fixtures keep their documented October dates.

Eleven added unit cases exercise draft scope/TTL/corruption/storage failure, permission-based pruning, identity clearing, inbox ordering/filters, blocked/unrelated/removed/youth message exclusions and Malaysia date boundaries. Six added desktop/mobile browser cases exercise separate drafts across DMs and school chat, reload/send/discard/sign-out cleanup, real account failed-send/retry, incoming-message scroll preservation, block cleanup, category deep links, a fixed-clock Malaysia year boundary and saved-date retention. The account conversation flow uses actual isolated local APIs and persistence; only the deliberate failed POST is intercepted.

The full suite passed **60/60 browser cases** and **141/141 unit/database tests**. Lint and strict TypeScript passed; the production build and private-data trace check passed. Final production screenshot/WCAG review covered inbox, draft, empty search and study creation at desktop, tablet and phone sizes: 12 views with no page errors, horizontal overflow or automated findings after the placeholder contrast adjustment. Normal account data was not used for synthetic test accounts. Hosted Supabase Auth/PostgREST remains untested without credentials.

## Larger text and revised copy

Sign-in/registration use 47–66px headlines with an italic serif accent, 17px descriptions and inputs, 15px field labels and larger buttons/helper text. The cover headline grows to 56–80px, with clearer study/game/community language. Landing, home, profile, schools, places, onboarding and activity forms have revised wording. Workspace headings, card titles/descriptions, navigation and form text use larger reading sizes in `src/app/typography.css`, imported after the existing design layers. Plan titles allow three lines. Local account/recovery instructions, fictional-demo disclosure and provider-booking boundaries remain explicit.

Screenshot and automated WCAG 2 A/AA, 2.1 AA and 2.2 AA checks covered 33 views at widths 320, 390, 900, 1024 and 1440: login/registration/recovery at every width, plus landing, home, creation, places, profile and chat at desktop/phone/tablet. There were no page exceptions, horizontal overflow or automated findings. A final production review checked 12 login/registration/home/form views at 320, 390 and 1440 after the title-wrapping adjustment, also with no exceptions, overflow or findings. Computed sign-in headlines were 47px at 320, 49.92px at 390 and 66px at 1440.

All 14 targeted production browser cases passed, covering individual signup/onboarding/logout/login/recovery, landing/demo entry, route responsiveness, representative accessibility, venue/draft fields, school chat and reciprocal messaging/blocking on desktop/mobile. Lint, strict TypeScript, formatting and the production build/privacy checks passed. No new business logic or database migration was introduced, and no new unit tests were added for copy or CSS.
