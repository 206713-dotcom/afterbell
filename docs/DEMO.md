# A three-minute AfterBell demonstration

All names, schools, memberships, offers, activities and outcomes in the demo are fictional. The calculations use the actual application engine. No real invitations or bookings occur.

## 0:00 — A community problem

Open the homepage: **Find your people. Make it happen.** Explain that plans often stall because a small requirement is missing. Enter the interactive demo. Point out the Demo Data strip and zero confirmed activities. The impact chart is computed from saved state, not fabricated history.

## 0:30 — A game, one connection away

Open UNLOCK Lab and choose **One more for Saturday doubles?** Run UNLOCK. Three existing players need a compatible fourth. Hana can play but needs a racket. Adam has an opted-in spare. The engine computes both actions, their time window, cost and constraints.

Open the baseline comparison: simple dependency-free player discovery at the original time cannot solve this particular gap. UNLOCK searches dependencies rather than merely filtering interests. Explain that this is a bounded search, not a global optimum claim.

Select Hana in the network to inspect the racket dependency. Switch between **Original plan** and **UNLOCK proposal**. Open **What if one piece changed?**, remove Adam’s offer, and test: the same real engine reports the remaining blocker. Reset the experiment to recover the feasible combination. Experiments do not overwrite the saved proposal.

## 1:10 — Feasible is not confirmed

Send the invitations and open the group room. **Confirm this session** is disabled. Simulate one character's acceptance: it remains disabled. Simulate the other: it becomes available. Confirm the session, then return to the dashboard to show the changed state. Record attendance separately; completion is a separate organizer action.

The dashboard’s **Confirmed** plan tab now contains the session. In the session room, **Add to calendar** downloads an `.ics` file with the confirmed times. The file does not sync later changes.

To show cancellation, simulate a player cancellation instead of completing. The activity becomes BLOCKED, reservations are released, the declined person is excluded, and **Find a replacement** opens analysis again. The engine honestly reports a remaining player gap if nobody else has opted in.

## 1:50 — A safer school space

Reset the demo in Settings. Analyze **Make maths make sense, together.** Five fictional learners need an approved peer tutor and a room. The approved tutor and room are available in the afternoon, so UNLOCK selects that supplied alternative. It never invents availability or verification.

Show the private school hub and explain invitation plus administrator approval. Optionally switch the demo profile to Under 18, then Explore: public adult activities disappear and only the approved school hub remains. Explain that live restrictions are database-enforced, while the demo illustrates them with fictional local data.

## 2:25 — One resource, more possibilities

Reset again. **Analyze all open Sparks**. The code/kopi and design sessions share a projector and some existing participants. The portfolio search assigns nonoverlapping windows. It also considers existing participant conflicts across other activities. These proposals still need consent; hypothetical allocation is not a booking.

The schedule below the Lab shows these proposed allocations. Choose **Show shared connections** to isolate the two activities using the same projector at different times. Individually generated proposals can compete for an offer; confirmation always rechecks conflicts.

## Optional discovery walkthrough

Explore → Petaling Jaya → 24 October → Afternoon → **Room for more people**. The card displays the matching 2 pm slot. Switch to list view, bookmark the Spark, enable **Saved**, and refresh: the URL preserves the full search. Clear the filters to restore all accessible activities. Recommendation reasons come from the profile’s explicit preferences, rather than a fabricated AI score.

## 2:50 — Measurable, honest outcomes

Open **Community impact** from the menu to compare Sparks, feasible proposals, confirmed sessions and completed activities. Show the data changing after explicit actions. End with the implemented boundaries: a real solver, transactional reservations, protected communities, a tested demo, and a Supabase integration ready for staging configuration. Do not describe fictional counts as real adoption or claim a competition score.
