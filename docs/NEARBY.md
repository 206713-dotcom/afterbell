# Nearby discovery

Open `/nearby` from **Near you** in the sidebar or the dashboard. The local demo contains eight fictional adult profiles. Live results come from explicitly published profiles in Supabase; demo profiles are never substituted for an empty live directory.

## How it works

- Choose a broad area, then 5, 10, 25, 50 or 100 km, or all supported Malaysian areas. Filter by interests, shared interests, name or subject. Sort by area distance or shared-interest count.
- Cards show a first name, chosen area, intro, interests and a distance band. A profile dialog adds volunteered subjects, badminton level and general availability. There are no online indicators or live person pins.
- Nearby Sparks use their existing city, so their distances are explicitly labelled **city estimates**. The original UNLOCK solver still uses exact city/hub eligibility; nearby discovery does not silently relax matching or reservation rules.
- The optional map shows only a broad reference area through OpenStreetMap, loaded after choosing **See area map**. Device coordinates and person markers are never put in the map URL.

## Device location

**Use my location** makes a single `getCurrentPosition` request after a click. The browser controls permission. Denial, timeout, an unsupported location or poor accuracy leaves manual area selection available. `Permissions-Policy` allows geolocation only for the same origin; camera and microphone remain disabled.

Raw device coordinates live only in component memory. They are not saved to local storage, the profile, a cookie, an audit record or a URL, and are not sent to our API. A live search sends the nearest supported broad-area ID and a widened search radius; client-side Haversine filtering uses the temporary position. Cancelling a pending request or choosing a manual area prevents a late callback from changing that choice. **Forget device location** clears the temporary origin.

The browser API requires a secure context (HTTPS, or supported localhost development) and user permission. See [MDN: getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition).

## Publishing a nearby profile

Browsing never enables publication. **My nearby profile** lets an adult explicitly choose an area, add an intro of up to 180 characters, and turn **Show my profile in nearby discovery** on or off. This is separate from the existing matching-preferences opt-in.

The shared projection consists of first name, chosen broad area, intro, interests, subjects, badminton level and general availability. The private `profiles` table keeps its own-row read policy. Full names, email, age category, private hub membership, actual device position and street addresses are not included in directory results.

Both the reader and listed member must be onboarded adults. Youth accounts see a link to their approved school communities, with no public nearby people or geolocation control. Database checks enforce this boundary independently of the interface. Blocks exclude the pair in both directions. Direct table writes are revoked; the save function always derives the owner from `auth.uid()`.

## Database setup

For a fresh project apply, in order:

1. `supabase/migrations/202610180001_afterbell.sql`
2. `supabase/migrations/202610180002_nearby.sql`

If the foundation is already applied, run only the second migration. It adds a static `nearby_areas` reference catalogue, private `nearby_profiles` settings, and three checked RPCs: `afterbell_nearby_settings`, `afterbell_save_nearby`, and `afterbell_nearby`.

`GET /api/nearby` authenticates with Supabase and returns only the safe directory projection. Search results are distance-sorted and bounded to 100 opted-in profiles. Responses use `private, no-store`. Mutation requests keep the existing origin, size and validation checks. `/api/state` loads the caller's nearby settings without exposing other settings rows.

The reference points are rounded, approximate area centres, not administrative boundaries or addresses. `src/lib/locations.ts` and the migration catalogue must stay in sync; the database suite checks this. Add catalogue entries through an additive migration when expanding coverage.

## Validation and limitations

Tests exercise distance math, filtering, opt-in/out, safe-field projection, private table reads, blocked pairs, owner spoofing, anonymous access, youth access, unsupported areas, browser permission/denial, persistence, mobile overflow and automated accessibility. Browser location tests use synthetic positions, not the user's real location.

Hosted Supabase Auth and PostgREST have not been tested: credentials are absent in this workspace. The migration and RPCs run in embedded PostgreSQL tests. No geocoding key or map SDK is required. These broad-area estimates cannot tell whether a person is currently nearby, provide travel times, or verify a venue. Large-scale pagination, abuse rate limiting and richer area coverage remain rollout work.
