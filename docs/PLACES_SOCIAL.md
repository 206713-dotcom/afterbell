# Places, school communities and connections

## Find a court or study space

Open **Courts & study spaces** in navigation. Search by centre, district or city, then choose a place. **Check booking** opens the provider's arrangements; **Make a plan here** fills the venue, category and city in a Spark.

Search, area filters and the selected place are retained in the URL for reloads and browser navigation. **Reset filters** returns to the full category, and each directory card has **View booking options** for a direct provider handoff. Global search also finds named venues and opens the filtered, selected directory entry.

The directory contains 43 badminton centres and 12 libraries, study spaces and coworking locations, researched on 22 October 2026. `src/data/places.json` holds each record's official operator or booking-provider source and booking URL. Names and locations are listings, not inspections, endorsements or claims of available inventory. Exact street addresses are included only where confirmed; other entries display the listed area/city. Prices, opening hours, court inventories and ratings are not invented or copied into an availability feed.

42 badminton entries link to publicly listed AFA venue calendars. Their numeric `auth` query identifies the venue and is not a user's authentication token. Only HTTPS calendars on `book.afa-sports.com` with a numeric venue ID can be embedded. The embedded provider controls the court/date/time selection, account, price, reservation, payment and confirmation. A full-page link remains available if third-party sign-in, cookies or payments fail inside the frame. Calendars load only when opened. Courtsite disallows framing, so it is not embedded.

Sports Arena Sentosa uses its operator's contact page. Study arrangements vary: libraries can require membership or a room enquiry; MeTime, Sandbox and WORQ use their own booking or enquiry processes. No library desk is represented as instantly reservable when only contact arrangements are published.

Primary study sources include [PPAS facilities](https://www.ppas.gov.my/en/fasiliti/), [Kuala Lumpur Library FAQ](https://perpustakaankualalumpur.dbkl.gov.my/en/faq/), [PJ Community Library](https://www.mbpjlibrary.gov.my/portal/), [JFKL Library](https://www.jfkl.org.my/library/), [MeTime](https://www.metime.my/), [Sandbox rooms](https://www.sandboxco.space/meeting-room-for-rent) and [WORQ locations](https://worq.space/locations-flexible-space/). Individual AFA listing links are included with every court entry.

After a venue confirms a booking, the organizer records the court/room, exact time and their reference. This records the organizer's statement; AfterBell does not verify the provider's confirmation or reserve a second slot. Changing the venue, date, time or court clears the confirmation fields. Booked plans allow one time window, not speculative alternative slots. Shared activity cards show the space and organizer-recorded status; the reference stays with the organizer and is excluded from calendar exports and other users' API responses. PostgreSQL stores references separately behind owner-only read policies.

## Your school and its common room

Choose an existing approved school/university during onboarding, in profile settings, or on **Your school**. The affiliation is saved and a pending membership is created. An organizer must approve the request before that account can read activities or school chat. Choosing a name never verifies enrollment or approves membership.

An adult can start a private school community from this page. A platform administrator reviews the organization and its moderation; the community is not automatically marked approved. The creator manages membership requests through the community's Members tab. Approved members share one **School chat** tab, even across different accounts. School selection does not remove other memberships.

Normal accounts start without fictional school communities or classmates. The labelled demo supplies fictional schools and conversations so the flow can be explored without impersonating real institutions.

## Friends and conversations

**Friends** contains My connections, Requests and Discover people. Discovery includes opted-in adult profiles and opted-in members of a shared approved community. Existing request/connection parties remain visible to each other unless blocked or ineligible. Only the recipient can accept a request. An accepted adult connection opens a private conversation; a pending request cannot send one. Removing a connection closes its chat. Declined/removed pairs cannot immediately generate another request.

Pending incoming requests appear in Home's next steps, the Friends navigation badge and notifications. **Review requests** opens the Requests tab directly. The selected tab, discovery query and open conversation survive reloads in the URL; accepted connections are also available through global search. School-directory searches similarly retain their query.

The conversation list searches connection names and cities and sorts recent conversations first, with the last message's preview and date. Removed messages show a placeholder. Youth connections show a shared-school destination and never private-message previews. On phones, selecting a conversation scrolls to it and **All connections** returns to the list. While reading earlier messages, an incoming message leaves the reading position alone and shows **Jump to latest**.

Unsent messages are stored only in this tab's `sessionStorage`, scoped by account, demo/account mode and conversation. The interface says when a draft is saved and offers **Discard draft**. Drafts expire after 24 hours without editing and clear after sending, UI sign-out, a detected session expiry, demo reset, or a canonical account read showing the conversation is no longer allowed. A failed send retains the draft for retry. Storage denial or quota failure leaves the composer usable and shows that draft saving is unavailable. Drafts do not sync between devices and are not read receipts or delivered messages. Closing the tab follows the browser's session-storage lifecycle, including its tab-restore behavior.

Under-18 accounts connect only with peers in shared approved private youth communities. They use the moderated community conversation; adult/youth connections and private youth direct messages are unavailable.

Messages are bounded to 1,500 characters and rendered as text. New messages refresh every five seconds while the tab is visible. Senders can remove their messages; community organizers/admins can remove group messages. Removal leaves a placeholder. Blocks apply in both directions to discovery, connection visibility and messaging. Settings manages the account's block list. A member who loses approval immediately loses the room's API access.

SQLite and hosted PostgreSQL enforce these permissions on the server. Browser-provided sender, requester, role or owner fields cannot impersonate another account. PostgreSQL uses security-definer checked RPCs and read policies; authenticated clients cannot insert directly into connections or messages. Local account tests use temporary databases; browser tests use `.local/browser-accounts`, separate from normal account data.

Hosted Supabase needs all five ordered migrations. Auth/email delivery and real PostgREST connectivity still require staging validation with project credentials. No production deployment or real venue reservation/payment was made during implementation.
