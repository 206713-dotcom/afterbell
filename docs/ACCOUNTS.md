# Individual accounts and communities

Updated 22 October 2026.

Open `/auth`, choose **Create an account**, enter an email and password (at least ten characters), and save the recovery key. Complete the three profile steps. Use **Sign out** in the account bar; returning users sign in with their email/password. Forgotten passwords can be reset with the email and recovery key. Resetting revokes existing sessions and replaces the key.

Local accounts persist on this server and start with empty profiles and activities. The fictional browser demo is separate. Passwords use asynchronous scrypt with a random salt. Random session and recovery tokens are stored hashed. Session cookies are HttpOnly and SameSite, expire after seven days, and are revoked on logout/recovery. Auth attempts have persistent limits. The actor comes from the session, never a supplied profile ID. Local accounts do not claim email verification or delivery.

The local backend uses Node 24's SQLite at `.local/accounts/afterbell.sqlite`, WAL, and immediate transactions. Back up consistently, including sidecars if the server is running. It is for a persistent single-machine installation and is disabled on Vercel, when Supabase is configured, or with `AFTERBELL_LOCAL_ACCOUNTS=false`. Local accounts are not automatically migrated into Supabase.

The first local account receives the installation's platform administrator role; an adult profile is required to use it. Subsequent accounts are ordinary members. Supabase administrators are explicitly provisioned using the README SQL. School identity checks and active moderation remain human responsibilities.

One account can join several schools, universities, clubs or organizations. Each has its own membership, activities, directory, invitations and roles. Schools/universities must be private. New communities require platform review before publishing activities; student access needs separate school approval. Creators become community owner/administrator.

Invitations are random, stored hashed, expire after seven days, and are single use. Redemption creates a pending request. Pending/rejected users cannot read private activities or directories. Administrators/organizers review requests; only administrators can change roles or remove members. Organizers cannot promote themselves. Transfer ownership before demoting/removing an owner; keep at least one administrator. Resolve confirmed commitments before removal. Activity participation requires a separate organizer approval.

Names and interests in the community directory require profile opt-in, except own details and names needed by authorized managers for moderation. Email, age group, recovery keys and other private memberships never enter that directory. Public nearby profiles are a separate adult opt-in. Blocks apply in both directions.

Sparks support own-only drafts and publication, community preselection, academic subject/level/goals and badminton singles/doubles/casual formats. The places directory opens real provider booking arrangements. An organizer can record their booked court/room and time; selecting a listing alone makes no reservation. Booking references stay private to their organizer. Metrics derive from accessible saved records; feasible proposals still need consent. Facilitators count as individual people in matching and reservations. See [places, schools and connections](PLACES_SOCIAL.md) for shared school chat and mutual connections.

`npm run test:e2e` builds `.next-test`, runs a production server on port 3100, and uses `.local/browser-accounts/afterbell.sqlite`. Test users never seed the normal account database. Unit tests use temporary SQLite and embedded PostgreSQL databases. Development uses Webpack and excludes database files from its watcher.

Hosted verification, SMTP, OAuth and Supabase/PostgREST require project configuration and deployment testing. Apply all five migrations in order before using hosted community and conversation controls.

The production build excludes local databases, test records and private environment files from deployment manifests and checks the resulting traces. The local database remains on the running installation; deployment does not transfer it.
