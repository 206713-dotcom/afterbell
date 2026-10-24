import type { Spark, TimeWindow } from "./types";
import { venueById } from "./venues";

function escapeText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}
function timestamp(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
// RFC 5545 folds content lines at 75 octets, including multibyte names.
function foldLine(line: string) {
  const encoder = new TextEncoder();
  let result = "",
    bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    result += character;
    bytes += size;
  }
  return result;
}
export function sessionCalendar(
  spark: Spark,
  window: TimeWindow,
  now = new Date(),
) {
  if (spark.status !== "CONFIRMED")
    throw new Error("Confirm the session before adding it to your calendar.");
  const venue = venueById(spark.venueId);
  const location = venue
    ? [venue.name, spark.spaceLabel, venue.address || venue.area, venue.city]
        .filter(Boolean)
        .join(" · ")
    : spark.city;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AfterBell//Community Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(spark.id)}@afterbell.local`,
    `DTSTAMP:${timestamp(now.toISOString())}`,
    `DTSTART:${timestamp(window.start)}`,
    `DTEND:${timestamp(window.end)}`,
    `SUMMARY:${escapeText(spark.title)}`,
    `LOCATION:${escapeText(location)}`,
    `DESCRIPTION:${escapeText(`${spark.description}\nConfirmed in AfterBell. Check the session room for any changes. This downloaded calendar file will not update automatically.`)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(foldLine)
    .join("\r\n");
}
