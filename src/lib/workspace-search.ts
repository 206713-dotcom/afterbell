import { accessibleSparks } from "./discovery";
import { connectionAllowed, sharedChatHub } from "./social";
import { canReadHub, canReadSpark } from "./communities";
import { venues, type Venue } from "./venues";
import type { AppState } from "./types";

export function placeHref(v: Venue) {
  return `/places?${new URLSearchParams({ kind: v.kind, place: v.id, q: v.name })}`;
}
export function connectionHref(id: string) {
  return `/connections?${new URLSearchParams({ chat: id })}`;
}
export function workspaceSearch(state: AppState, query: string) {
  const term = query.trim().toLocaleLowerCase();
  const matches = (...text: string[]) =>
    text.join(" ").toLocaleLowerCase().includes(term);
  if (!term) return { activities: [], hubs: [], places: [], friends: [] };
  const activities = [
    ...accessibleSparks(state),
    ...state.sparks.filter(
      (s) =>
        s.status === "DRAFT" &&
        s.ownerId === state.profile.id &&
        canReadSpark(state, s),
    ),
  ]
    .filter((s) => matches(s.title, s.subject ?? "", s.city))
    .slice(0, 5);
  const hubs = state.hubs
    .filter((h) => canReadHub(state, h) && matches(h.name, h.city))
    .slice(0, 4);
  const places = venues
    .filter((v) =>
      matches(
        v.name,
        v.city,
        v.area,
        v.kind === "study" ? "library study room" : "badminton court",
      ),
    )
    .slice(0, 5);
  const friends = (state.connections ?? [])
    .flatMap((c) => {
      if (
        c.status !== "accepted" ||
        ![c.requesterId, c.addresseeId].includes(state.profile.id)
      )
        return [];
      const person = state.connectionPeople?.find(
        (p) =>
          p.id ===
          (c.requesterId === state.profile.id ? c.addresseeId : c.requesterId),
      );
      return person &&
        connectionAllowed(state, person) &&
        matches(person.name, person.city)
        ? [
            {
              ...person,
              connectionId: c.id,
              href:
                state.profile.age === "adult"
                  ? connectionHref(c.id)
                  : `/hubs/${encodeURIComponent(sharedChatHub(state, person)!)}?tab=chat`,
            },
          ]
        : [];
    })
    .slice(0, 4);
  return { activities, hubs, places, friends };
}
