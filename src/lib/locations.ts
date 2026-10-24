// Broad reference points, not boundaries, addresses, or individual locations.
// These rounded points are used only for approximate area-to-area discovery.
export const areas = [
  {
    id: "petaling-jaya",
    name: "Petaling Jaya",
    city: "Petaling Jaya",
    lat: 3.107,
    lng: 101.607,
  },
  { id: "ss2", name: "SS2", city: "Petaling Jaya", lat: 3.118, lng: 101.622 },
  {
    id: "damansara-utama",
    name: "Damansara Utama",
    city: "Petaling Jaya",
    lat: 3.135,
    lng: 101.622,
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    city: "Kuala Lumpur",
    lat: 3.139,
    lng: 101.687,
  },
  {
    id: "ttdi",
    name: "Taman Tun Dr Ismail",
    city: "Kuala Lumpur",
    lat: 3.146,
    lng: 101.624,
  },
  {
    id: "bangsar",
    name: "Bangsar",
    city: "Kuala Lumpur",
    lat: 3.129,
    lng: 101.671,
  },
  {
    id: "cheras",
    name: "Cheras",
    city: "Kuala Lumpur",
    lat: 3.104,
    lng: 101.741,
  },
  {
    id: "george-town",
    name: "George Town",
    city: "George Town",
    lat: 5.414,
    lng: 100.329,
  },
  {
    id: "johor-bahru",
    name: "Johor Bahru",
    city: "Johor Bahru",
    lat: 1.493,
    lng: 103.742,
  },
  { id: "ipoh", name: "Ipoh", city: "Ipoh", lat: 4.598, lng: 101.09 },
  {
    id: "shah-alam",
    name: "Shah Alam",
    city: "Shah Alam",
    lat: 3.074,
    lng: 101.518,
  },
  {
    id: "kota-kinabalu",
    name: "Kota Kinabalu",
    city: "Kota Kinabalu",
    lat: 5.981,
    lng: 116.073,
  },
  { id: "kuching", name: "Kuching", city: "Kuching", lat: 1.553, lng: 110.359 },
  { id: "melaka", name: "Melaka", city: "Melaka", lat: 2.196, lng: 102.249 },
  {
    id: "seremban",
    name: "Seremban",
    city: "Seremban",
    lat: 2.726,
    lng: 101.938,
  },
  { id: "kuantan", name: "Kuantan", city: "Kuantan", lat: 3.807, lng: 103.326 },
  {
    id: "alor-setar",
    name: "Alor Setar",
    city: "Alor Setar",
    lat: 6.124,
    lng: 100.368,
  },
  {
    id: "kuala-terengganu",
    name: "Kuala Terengganu",
    city: "Kuala Terengganu",
    lat: 5.329,
    lng: 103.137,
  },
  {
    id: "kota-bharu",
    name: "Kota Bharu",
    city: "Kota Bharu",
    lat: 6.126,
    lng: 102.238,
  },
  { id: "kangar", name: "Kangar", city: "Kangar", lat: 6.441, lng: 100.198 },
  {
    id: "putrajaya",
    name: "Putrajaya",
    city: "Putrajaya",
    lat: 2.926,
    lng: 101.696,
  },
  { id: "labuan", name: "Labuan", city: "Labuan", lat: 5.277, lng: 115.242 },
] as const;
export type Area = (typeof areas)[number];
export type Coordinates = { lat: number; lng: number };
export const areaById = (id?: string | null) =>
  areas.find((area) => area.id === id);
export const cityArea = (city: string) =>
  areas.find((area) => area.city === city && area.name === city) ?? areas[0];
export const areaLabel = (area: Area) =>
  area.name === area.city ? area.name : `${area.name}, ${area.city}`;
export function distanceKm(a: Coordinates, b: Coordinates) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const h =
    Math.sin(radians(b.lat - a.lat) / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(radians(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, h))));
}
export function distanceLabel(distance: number) {
  if (distance < 5) return "Under 5 km";
  if (distance < 10) return "About 5–10 km";
  if (distance < 25) return "About 10–25 km";
  if (distance < 50) return "About 25–50 km";
  if (distance < 100) return "About 50–100 km";
  return "Over 100 km";
}
export function nearestArea(position: Coordinates) {
  return [...areas].sort(
    (a, b) => distanceKm(position, a) - distanceKm(position, b),
  )[0];
}
