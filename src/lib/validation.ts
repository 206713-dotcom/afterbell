import { z } from "zod";
import { areaById } from "./locations";
import { venueById, venueForCategory } from "./venues";
export const nearbySchema = z
  .object({
    areaId: z
      .string()
      .max(50)
      .nullable()
      .refine(
        (id) => id === null || !!areaById(id),
        "Choose an available area.",
      ),
    bio: z.string().trim().max(180),
    visible: z.boolean(),
  })
  .refine(
    (value) => !value.visible || !!value.areaId,
    "Choose a broad area before making your profile visible.",
  );
export const cities = [
  "Petaling Jaya",
  "Kuala Lumpur",
  "George Town",
  "Johor Bahru",
  "Ipoh",
  "Shah Alam",
  "Kota Kinabalu",
  "Kuching",
  "Melaka",
  "Seremban",
  "Kuantan",
  "Alor Setar",
  "Kuala Terengganu",
  "Kota Bharu",
  "Kangar",
  "Putrajaya",
  "Labuan",
  "Subang Jaya",
  "Klang",
  "Puchong",
  "Cheras",
  "Seri Kembangan",
  "Rawang",
  "Ampang",
  "Cyberjaya",
  "Kajang",
  "Semenyih",
  "Sungai Buloh",
  "Banting",
  "Batang Kali",
  "Tanjong Malim",
  "Bandar Baru Bangi",
  "Tanjong Karang",
] as const;
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  city: z.enum(cities),
  age: z.enum(["adult", "youth"]),
  interests: z.array(z.string().max(40)).min(1).max(12),
  availability: z.array(z.string().max(50)).max(14),
  experience: z.string().max(40),
  subjects: z.array(z.string().max(40)).max(12),
  communityTypes: z.array(z.string().max(40)).max(5),
  discoverable: z.boolean(),
  hubDirectoryVisible: z.boolean().default(false),
  preferredActivities: z.array(z.string().max(40)).max(12).default([]),
  schoolHubId: z.string().max(80).nullable().default(null),
});
export const sparkSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(8, "Give your Spark a title of at least 8 characters.")
      .max(100),
    description: z
      .string()
      .trim()
      .min(20, "Add a little more detail (at least 20 characters).")
      .max(1500),
    category: z.enum(["badminton", "study", "tutoring", "community"]),
    city: z.enum(cities),
    hubId: z.string().nullable(),
    target: z.number().int().min(2).max(30),
    skill: z.string().max(60),
    subject: z.string().trim().max(60).default(""),
    academicLevel: z.string().trim().max(40).default("General learning"),
    learningGoals: z.string().trim().max(400).default(""),
    gameMode: z.enum(["singles", "doubles", "casual"]).default("casual"),
    venueId: z.string().max(100).nullable().default(null),
    spaceLabel: z.string().trim().max(50).default(""),
    bookingStatus: z.enum(["planned", "booked"]).default("planned"),
    bookingReference: z.string().trim().max(100).default(""),
    draft: z.boolean().default(false),
    budget: z.number().min(0).max(5000),
    windows: z
      .array(
        z
          .object({
            start: z.iso.datetime({ offset: true }),
            end: z.iso.datetime({ offset: true }),
          })
          .refine(
            (w) => Date.parse(w.end) > Date.parse(w.start),
            "End time must be after start time.",
          ),
      )
      .min(1)
      .max(12),
    requirements: z
      .array(
        z.object({
          id: z.string().max(80),
          kind: z.enum([
            "participant",
            "tutor",
            "racket",
            "room",
            "venue",
            "facilitator",
            "projector",
          ]),
          quantity: z.number().int().min(1).max(30),
          skill: z.string().max(60).optional(),
          capacity: z.number().int().min(1).max(100).optional(),
        }),
      )
      .max(12),
  })
  .refine(
    (s) => s.category !== "tutoring" || !!s.hubId,
    "Peer tutoring takes place inside approved private hubs.",
  )
  .refine(
    (s) =>
      s.category !== "badminton" ||
      s.gameMode === "casual" ||
      s.target === (s.gameMode === "singles" ? 2 : 4),
    "Singles needs two players; doubles needs four.",
  )
  .refine(
    (s) => !s.venueId || !!venuesMatch(s),
    "Choose a venue in the activity’s city.",
  )
  .refine(
    (s) =>
      !!s.venueId ||
      (!s.spaceLabel && !s.bookingReference && s.bookingStatus === "planned"),
    "Choose a centre before adding booking details.",
  )
  .refine(
    (s) =>
      s.bookingStatus !== "booked" ||
      (!!s.spaceLabel && !!s.bookingReference && s.windows.length === 1),
    "For a booked space, add its court or room, confirmation reference and one confirmed time window.",
  );
function venuesMatch(s: {
  venueId: string | null;
  city: string;
  category: string;
}) {
  const venue = venueById(s.venueId);
  return venue && venue.city === s.city && venueForCategory(venue, s.category);
}
export const hubSchema = z
  .object({
    name: z.string().trim().min(4).max(80),
    description: z.string().trim().min(20).max(1000),
    city: z.enum(cities),
    category: z.enum(["badminton", "study", "tutoring", "community"]),
    visibility: z.enum(["public", "private"]),
    kind: z
      .enum(["school", "university", "club", "organization", "community"])
      .default("community"),
  })
  .refine(
    (h) =>
      !["school", "university"].includes(h.kind) || h.visibility === "private",
    "School and university communities must be private.",
  );
