# afterbell.

**Find your people. Make it happen.**

A Malaysia-wide community MVP for study circles, approved peer tutoring, badminton, and other activities. The UNLOCK Engine searches explainable combinations of people, equipment, rooms, and supplied time windows. It creates proposals; it never supplies consent or books a venue.

## Try the competition demo

[Open AfterBell](https://afterbell-sepia.vercel.app) and choose **Try the live demo**. No account is required. The demo uses the real UNLOCK engine with clearly labelled fictional people, communities and activities. Changes stay in your browser.

This hosted deployment provides the interactive demo. Online account registration and shared account data require a configured Supabase project and remain unavailable on this deployment. Persistent local accounts still work when running the project on your own computer.

## Run it

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open [localhost:3000/auth](http://localhost:3000/auth), create an account, save the recovery key, and complete your profile. Accounts and plans persist on this local server. Each account starts empty and keeps its own profile, memberships and preferences. [Account setup, community roles and privacy](docs/ACCOUNTS.md).

You can also **Try the live demo**. Its fictional data stays in this browser, separate from accounts. Settings → Reset demo restores it. “Live demo” means an interactive application, not production data.

Production build:

```sh
npm run build
npm start
```

Builds and development use Next.js's supported Webpack option. Development ignores local database files to prevent account writes from triggering reloads. Browser tests use a separate production bundle and database on port 3100.

## What is implemented

- Next.js App Router and strict TypeScript; responsive cream/forest/lilac design, locally bundled DM Sans and Instrument Serif typefaces, reusable Radix Button, Tailwind, Lucide, Framer Motion, reduced-motion support and Recharts.
- All requested routes, Spark creation/editing/deletion, profiles, multi-step onboarding, and settings. Discovery ranks by explicit city, interest, subject, and availability signals; supports date/time, city, category, bookmark, and open-space filters; and preserves search, sorting, and list/grid layout in the URL.
- Supabase SSR email/password registration, verification callbacks, login/logout, password recovery, persistent cookies, protected pages and authenticated API routes. Optional Google OAuth appears only when enabled.
- Persistent local accounts when Supabase is unconfigured: hashed passwords, server sessions, recovery keys, account isolation and shared communities. Disabled on Vercel; hosted accounts use Supabase.
- Multiple school/university/club/organization memberships; community switcher, state/activity/type filters, private directories, invitations, roles and ownership transfer. Save/publish drafts, academic subject/level/goals, badminton formats and computed impact metrics.
- PostgreSQL migration with normalized activities, requirements, offers, time slots, hubs, memberships, hashed invitation codes, proposals, individual actions, sessions, reservations, reports, audit trails, saved Sparks, notifications, blocks, and per-Spark declines.
- Private/public and youth/adult access checks enforced in database policies and checked mutation functions. Platform review of hubs, school approval, membership approval, peer tutor approval, and private managed-resource approval.
- Actual bounded deterministic UNLOCK search, dependency allocation, alternative schedules, portfolio beam search, existing-participant conflict checks, transparent baseline comparison, and explanatory results.
- Separate proposal, invitation, acceptance, confirmed, completed, declined and cancelled states. Confirmation rechecks requirements and reserves resources/people atomically. Participants can withdraw; the activity becomes blocked and needs an approved replacement.
- Opted-in offers, individual approval controls, group rooms, attendance, reporting, blocking, moderator review, data export, and three fictional demo scenarios.
- An actionable dashboard with pending decisions, in-progress/confirmed/saved plans, and visible recommendation reasons. Confirmed sessions export an escaped, Unicode-safe `.ics` calendar file; downloaded files do not sync subsequent changes.
- Clear Home, Explore, My plans and Communities navigation; a permanent mobile action bar, accessible menu drawer, named breadcrumbs, and global search with Ctrl/Cmd+K. `/plans` has searchable active, confirmed, draft, saved and past folders without the home preview's four-plan limit. `/impact` holds community metrics and comparisons.
- An editorial sign-in and registration experience with an original SVG court/study illustration, warm ivory and forest palette, focused account forms and explicit demo entry. The workspace shares refined type, quieter cards, clear active navigation and responsive layouts; the illustration contains no real booking or account data.
- Larger typography and revised product copy: 47–66px sign-in headings with a serif accent, 17px account descriptions/inputs, 15px field labels and larger workspace headings, cards and form text. `src/app/typography.css` holds this reading-size layer; mobile text wraps naturally and plan titles allow three lines.
- An interactive dependency graph with individual acceptance states and a connection inspector, original/proposal views, a temporary “what if” solver playground, and a cross-proposal schedule that identifies shared offers. Experiments do not change the saved Spark, proposal, invitations, or reservations.
- **Near you**: opted-in adult profiles, approximate distance bands, area/radius and shared-interest filters, nearby Sparks, optional browser geolocation, and a broad-area map. Device coordinates are never persisted or sent to the API. [Nearby setup and privacy](docs/NEARBY.md).
- A searchable directory of **43 badminton centres and 12 study spaces**, with operator/provider sources, area filters, directions and booking links. AFA's court/time calendar opens inside the app; library and other operator arrangements open through their official pages. Sparks keep a court/room label, confirmed time and organizer-recorded booking status, with a private booking reference. Provider availability and payment are not synchronized into AfterBell.
- A school picker in onboarding/profile and `/schools`, approved community group chats, reciprocal friend requests, adult connection chats, removal and blocking. Conversations persist across accounts and refresh every five seconds while the page is visible. Under-18 conversations stay in approved, moderated school communities. [Places, schools and connections](docs/PLACES_SOCIAL.md).
- Global search finds source-backed venues and accepted connections alongside accessible plans and communities. Friend requests appear on Home, the Friends navigation badge and notifications, with a direct link to the Requests tab. Venue filters/selection, school search and open conversations survive reloads through URL state; directory cards open booking options directly.
- Account reads coalesce overlapping requests, refresh on return to a visible page and ignore old responses after mutations. Initial failures show a retry screen; later outages retain the last loaded data with a retry banner. An expired session clears the private client workspace and offers sign-in again.
- The connection inbox supports name/city search, recent conversation ordering and message previews. Chat keeps your reading position when messages arrive, with a jump-to-latest control. Unsent drafts stay separate per account and conversation in the current tab for up to 24 hours; sending, discarding, signing out, session expiry or lost access clears them. Drafts are not sent to the server, and no cross-device draft sync or read receipts are claimed.
- Activity creation carries the selected discovery category into the form and uses tomorrow in Malaysia for new account plans. Existing saved dates stay intact; the labelled demo retains its fixed scenario dates.

The visible user messages in **“Find AI Coding Challenge”** were also consulted: nationwide reach, public plus school communities, tutoring/badminton, and combining AfterBell with UNLOCK. The chat reader did not expose the earlier assistant answers; no competition rubric or score is claimed.

## Configure Supabase

**Live Supabase Auth, email delivery, and hosted database connectivity have not been tested here: no project credentials were provided.** The local demo, embedded PostgreSQL policies/transactions, and browser workflows are independently tested.

1. Create a Supabase project or use a dedicated development project. Apply the five files in `supabase/migrations/` in filename order, through `202610220005_social.sql`. Apply only missing migrations when the foundation exists. These expect Supabase's `auth.users`, `auth.uid()`, `anon`, and `authenticated`; the foundation backfills existing Auth profiles. They are ordered migrations, not reset scripts.
2. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the public anon/publishable key), and your `NEXT_PUBLIC_SITE_URL`. **Do not use a service-role or secret key.** Restart Next.js after changing public environment variables.
3. In Supabase Authentication → URL Configuration, set your site URL and allow `http://localhost:3000/auth/callback` and your production callback URL. Enable email confirmations. Use a proper SMTP provider before real-user email testing.
4. The signup flow supports the PKCE callback at `/auth/callback`. For cross-device verification templates, use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. Recovery templates can use the same URL with `type=recovery`; recovery redirects to `/auth?mode=update`.
5. Optional Google: configure the Google provider and its Supabase redirect URL, then set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`. Otherwise no Google button appears.
6. Register and verify your own administrator account. In the SQL editor, grant the initial platform role using a **known Auth user ID**:

```sql
insert into public.platform_admins(user_id)
values ('REPLACE_WITH_YOUR_VERIFIED_AUTH_USER_UUID');
```

Only project administrators should run that bootstrap SQL. Users cannot write roles through the application. Create a hub; the creator becomes its hub administrator. Use Settings to review hubs, and approve a private school hub only after actually verifying its organization and moderation. Invite codes are single-use, hashed at rest, and expire after seven days. Joining by code creates a pending membership; an administrator must approve it.

Live verification to do after configuration:

- Register two adult test accounts and a separate youth test account; verify emails, login, logout, recovery and persistent sessions.
- Create/approve a private school hub. Confirm the youth and nonmember adult cannot read each other's private or public adult records. Approve membership through the administrator view.
- Create an explicit offer and compatible Spark with different accounts. Run UNLOCK, send the proposal, accept only as the invited account, confirm as organizer, record attendance, withdraw/cancel, and check reservation release.
- Open Supabase's database/security advisors, review policies, and check email rate limits. Embedded tests model the database behavior; they do not test the project's Auth configuration, email provider, PostgREST schema cache or real deployment network.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Unit tests include the solver and a real PostgreSQL-compatible runtime (PGlite, with `btree_gist`). The full migration is applied, and roles, RLS, transactions and exclusion constraints execute against it. This does not substitute for testing the migration in your Supabase project.

Browser tests cover desktop and mobile Chrome, all application routes, Spark CRUD/persistence, the UNLOCK/consent/confirmation flow, alternative scheduling, shared resources, youth UI separation, offers, declines, reports, reset, protected API access, and automated WCAG checks on representative pages. Google Chrome is used from the local installation. If Chrome is unavailable, run `npx playwright install chromium` and remove `channel: "chrome"` from the Playwright config to use the bundled browser.

See [verification notes](docs/VERIFICATION.md) for the final evidence and limits. Automated accessibility results are not a WCAG certification; screen-reader, zoom and human keyboard review should accompany a real rollout.

## Demo in three minutes

Read [the demo script](docs/DEMO.md). The original fixtures are fixed to **24–25 October 2026**, displayed in Malaysia time. They remain deterministic rather than moving silently with the current date.

1. Open UNLOCK Lab → **One more for Saturday doubles?** → Run UNLOCK. A player and dependent spare racket are computed together.
2. Send invitations. Confirm is disabled until **each** acceptance. Demo buttons explicitly simulate the fictional participant and owner responses.
3. Confirm, record attendance, or simulate cancellation. The dashboard reflects the actual saved state.
4. Reset and try the school maths scenario: the solver moves to the available afternoon tutor and room.
5. **Analyze all open Sparks** checks shared projectors and existing people across activities. It finds different windows when feasible. These are hypothetical allocations, not reservations.

## Deploy to Vercel

Import this repository into Vercel using the Next.js framework preset and Node 24 (or a currently supported compatible Node runtime). Use `npm ci`, `npm run build`, and the default Next.js output settings. Add the same public Supabase variables separately for Preview and Production. Set `NEXT_PUBLIC_SITE_URL` to the correct deployment origin, configure Supabase's allowlist accordingly, then redeploy after changing public variables.

Apply the database migration to the intended project before exercising live routes. Set `NEXT_PUBLIC_ENABLE_DEMO=false` if you want a live-only deployment. Demo cookies never authenticate `/api/state`, `/api/mutate`, or `/api/invite`.

The public competition demo uses the `afterbell` Vercel project, Node 24 and the Next.js preset. Its production branch is `codex/afterbell`, connected to this GitHub repository. Pushes to that branch automatically deploy updates. The production environment enables the fictional demo and disables local accounts. Private local data, environment files and build/test output are excluded from uploads.

## Architecture, limitations and assistance

- [Architecture and database](docs/ARCHITECTURE.md)
- [UNLOCK algorithm and limits](docs/ALGORITHM.md)
- [Safety and access model](docs/SECURITY.md)
- [Demo script](docs/DEMO.md)
- [Verification](docs/VERIFICATION.md)

This is a tested foundation, not a claim of nationwide production readiness. Search is bounded; cities and venues have a small initial coverage; no travel-time model, payment system, professional tutor verification, unrestricted messaging, real-time court feed, full organization identity-verification service, or operational moderation team is included. Age categories are self-declared once during onboarding and locked thereafter; reliable age assurance and school verification need real organizational processes before serving minors. The current read model loads accessible community data in one response; pagination, rate limiting, observability, abuse handling and load testing are needed before thousands of users.

**Codex assistance:** Codex helped implement the application, design system, solver, SQL policies, fixtures, documentation and tests, under the user's direction. All people and outcomes in demo fixtures are fictional. No testimonials, real-user adoption, competition score, venue booking or production impact is invented.
