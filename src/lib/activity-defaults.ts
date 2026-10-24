import type { Category } from "./types";

export function initialActivityCategory(value?: string): Category | undefined {
  return ["badminton", "study", "tutoring", "community"].includes(value ?? "")
    ? (value as Category)
    : undefined;
}
export function tomorrowInMalaysia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now.getTime() + 86400000));
}
