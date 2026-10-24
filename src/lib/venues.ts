import directory from "@/data/places.json";
export type PlaceKind = "badminton" | "study";
export type Venue = {
  id: string;
  name: string;
  kind: PlaceKind;
  city: string;
  area: string;
  address: string;
  source: string;
  bookingUrl: string;
  provider: "AFA" | "Courtsite" | "Venue" | "Library";
  description: string;
  checkedAt: string;
  contact: string;
  verification: string;
};
export const venues: Venue[] = directory.map((v) => ({
  ...v,
  kind: v.kind as PlaceKind,
  provider: v.provider as Venue["provider"],
  checkedAt: "22 October 2026",
  contact: v.bookingUrl,
  verification:
    "Listed by the venue or its booking provider. Check the live calendar for current prices and availability.",
}));
export function venueById(id: string | null | undefined) {
  return venues.find((v) => v.id === id);
}
export function venueLocality(venue: Venue) {
  return venue.area && venue.area !== venue.city
    ? `${venue.area}, ${venue.city}`
    : venue.city;
}
export function venueForCategory(venue: Venue, category: string) {
  return venue.kind === "badminton"
    ? category === "badminton"
    : ["study", "tutoring"].includes(category);
}
export function venueDirections(venue: Venue) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name} ${venue.address || venue.area} ${venue.city} Malaysia`)}`;
}
export function providerEmbed(venue: Venue) {
  // Only AFA's publicly linked, frame-compatible venue schedulers are embedded.
  if (venue.provider !== "AFA") return null;
  const url = new URL(venue.bookingUrl);
  return url.protocol === "https:" &&
    url.hostname === "book.afa-sports.com" &&
    /^\d+$/.test(url.searchParams.get("auth") ?? "")
    ? url.href
    : null;
}
