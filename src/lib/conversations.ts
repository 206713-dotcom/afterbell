import type { AppState } from "./types";
import { connectionAllowed } from "./social";

export function connectionInbox(state: AppState, query = "") {
  const term = query.trim().toLowerCase();
  return (state.connections ?? [])
    .flatMap((c) => {
      if (
        c.status !== "accepted" ||
        ![c.requesterId, c.addresseeId].includes(state.profile.id)
      )
        return [];
      const other =
        c.requesterId === state.profile.id ? c.addresseeId : c.requesterId;
      const person = state.connectionPeople?.find((p) => p.id === other);
      if (
        !person ||
        !connectionAllowed(state, person) ||
        !`${person.name} ${person.city}`.toLowerCase().includes(term)
      )
        return [];
      const last = (state.profile.age === "adult" ? (state.messages ?? []) : [])
        .filter(
          (m) =>
            m.connectionId === c.id &&
            !m.hubId &&
            [state.profile.id, other].includes(m.senderId) &&
            !state.blocked.includes(m.senderId),
        )
        .sort(
          (a, b) =>
            Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
            b.id.localeCompare(a.id),
        )[0];
      return [
        {
          connection: c,
          person,
          last,
          preview: last
            ? last.removed
              ? "Message removed"
              : `${last.senderId === state.profile.id ? "You: " : ""}${last.body.replace(/\s+/g, " ")}`
            : state.profile.age === "adult"
              ? "Say your first hello"
              : "Shared school conversation",
          updatedAt: last?.createdAt ?? c.createdAt,
        },
      ];
    })
    .sort(
      (a, b) =>
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
        a.person.name.localeCompare(b.person.name),
    );
}
