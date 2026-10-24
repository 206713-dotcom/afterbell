import { areaById, distanceKm, type Coordinates } from "./locations";
import type { NearbyPerson, Profile } from "./types";
export const nearbyInterests = [
  "Badminton",
  "Study",
  "Tutoring",
  "Coding",
  "Design",
  "Community",
  "Volunteering",
] as const;
export function sharedInterests(person: NearbyPerson, profile: Profile) {
  return person.interests.filter((interest) =>
    profile.interests.some(
      (mine) => mine.toLowerCase() === interest.toLowerCase(),
    ),
  );
}
export function findNearbyPeople(
  people: NearbyPerson[],
  profile: Profile,
  blocked: string[],
  origin: Coordinates,
  radius: number,
  interest = "all",
  similar = false,
  query = "",
  sort = "distance",
) {
  if (profile.age !== "adult") return [];
  const results = people.flatMap((person) => {
    const area = areaById(person.areaId);
    if (!area || person.id === profile.id || blocked.includes(person.id))
      return [];
    const distance = distanceKm(origin, area);
    const shared = sharedInterests(person, profile);
    if (
      distance > radius ||
      (interest !== "all" && !person.interests.includes(interest)) ||
      (similar && !shared.length) ||
      !`${person.name} ${person.bio} ${person.interests.join(" ")} ${person.subjects.join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
    )
      return [];
    return [{ person, area, distance, shared }];
  });
  return results.sort(
    (a, b) =>
      (sort === "shared" ? b.shared.length - a.shared.length : 0) ||
      a.distance - b.distance ||
      a.person.id.localeCompare(b.person.id),
  );
}
