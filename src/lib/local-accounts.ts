// Node-only local development backend. Hosted deployments use Supabase/RLS.
import { DatabaseSync } from "node:sqlite";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { applyDemo, type Operation } from "./actions";
import { canReadHub, canReadSpark, demoImpact } from "./communities";
import { safeDirectory, syncCommunities } from "./community-actions";
import { isSocialOperation, visibleSocial } from "./social";
import type { ConnectionPerson } from "./types";
import {
  hubSchema,
  nearbySchema,
  profileSchema,
  sparkSchema,
} from "./validation";
import { z } from "zod";
import { eligible, overlaps } from "./engine";
import type { AppState, Profile } from "./types";

const derive = promisify(scrypt);
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(10).max(128),
});
const personalKeys = [
  "profile",
  "blocked",
  "saved",
  "notifications",
  "nearbySettings",
] as const;
type Account = {
  id: string;
  email: string;
  password: string;
  recovery: string;
  personal: string;
  admin: number;
};
const empty = (id: string): AppState => ({
  profile: {
    id,
    name: "Your neighbour",
    city: "Petaling Jaya",
    age: "adult",
    interests: [],
    availability: [],
    experience: "Beginner",
    subjects: [],
    communityTypes: [],
    onboarded: false,
    discoverable: false,
    hubDirectoryVisible: false,
    preferredActivities: [],
  },
  hubs: [],
  hubMembers: [],
  hubInvites: [],
  sparks: [],
  candidates: [],
  proposals: [],
  reports: [],
  blocked: [],
  joined: [],
  saved: [],
  notifications: [],
  nearbySettings: { areaId: null, bio: "", visible: false },
});
function personal(s: AppState) {
  return Object.fromEntries(personalKeys.map((k) => [k, s[k]]));
}
async function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex"),
) {
  const key = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

export class LocalAccounts {
  readonly db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, recovery TEXT NOT NULL, personal TEXT NOT NULL, admin INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS world(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS invites(hash TEXT PRIMARY KEY, hub_id TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);`);
    this.db
      .prepare("INSERT OR IGNORE INTO world VALUES(1,?)")
      .run(JSON.stringify(empty("")));
  }
  close() {
    this.db.close();
  }
  private transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  private account(id: string) {
    const row = this.db.prepare("SELECT * FROM accounts WHERE id=?").get(id) as
      Account | undefined;
    if (!row) throw new Error("Please log in again.");
    return row;
  }
  private limit(key: string, max = 12) {
    const now = Date.now();
    this.db.prepare("DELETE FROM limits WHERE expires<?").run(now);
    this.db
      .prepare(
        "INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1",
      )
      .run(digest(key), now + 15 * 60_000);
    const row = this.db
      .prepare("SELECT attempts FROM limits WHERE key=?")
      .get(digest(key));
    if (Number(row?.attempts) > max)
      throw new Error("Too many attempts. Please try again in 15 minutes.");
  }
  async register(input: unknown) {
    const { email, password } = credentials.parse(input);
    this.limit("registrations", 50);
    const encoded = await hashPassword(password),
      recoveryKey = randomBytes(24).toString("hex"),
      id = randomUUID();
    this.transaction(() => {
      if (this.db.prepare("SELECT id FROM accounts WHERE email=?").get(email))
        throw new Error(
          "An account already uses that email. Log in or use your recovery key.",
        );
      const admin =
        Number(
          this.db.prepare("SELECT count(*) AS n FROM accounts").get()?.n,
        ) === 0
          ? 1
          : 0;
      this.db
        .prepare("INSERT INTO accounts VALUES(?,?,?,?,?,?)")
        .run(
          id,
          email,
          encoded,
          digest(recoveryKey),
          JSON.stringify(personal(empty(id))),
          admin,
        );
    });
    return { token: this.newSession(id), recoveryKey };
  }
  async login(input: unknown) {
    const { email, password } = credentials.parse(input);
    this.limit(`login:${email}`);
    this.limit("login:all", 120);
    const row = this.db
      .prepare("SELECT * FROM accounts WHERE email=?")
      .get(email) as Account | undefined;
    const encoded = row?.password ?? `${"0".repeat(32)}:${"0".repeat(128)}`;
    const actual = await hashPassword(password, encoded.split(":")[0]);
    if (
      !row ||
      !timingSafeEqual(
        Buffer.from(actual.split(":")[1], "hex"),
        Buffer.from(encoded.split(":")[1], "hex"),
      )
    )
      throw new Error("That email and password do not match.");
    this.db
      .prepare("DELETE FROM limits WHERE key=?")
      .run(digest(`login:${email}`));
    return { token: this.newSession(row.id) };
  }
  async recover(input: unknown) {
    const { email, password } = credentials.parse(input);
    const key = z
      .object({ recoveryKey: z.string().length(48) })
      .parse(input).recoveryKey;
    this.limit(`recovery:${email}`);
    this.limit("recovery:all", 80);
    const row = this.db
      .prepare("SELECT * FROM accounts WHERE email=?")
      .get(email) as Account | undefined;
    if (
      !row ||
      !timingSafeEqual(Buffer.from(digest(key)), Buffer.from(row.recovery))
    )
      throw new Error("The email or recovery key is incorrect.");
    const encoded = await hashPassword(password),
      recoveryKey = randomBytes(24).toString("hex");
    this.transaction(() => {
      this.db
        .prepare("UPDATE accounts SET password=?,recovery=? WHERE id=?")
        .run(encoded, digest(recoveryKey), row.id);
      this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(row.id);
    });
    return { token: this.newSession(row.id), recoveryKey };
  }
  private newSession(id: string) {
    const token = randomBytes(32).toString("hex"),
      now = Date.now();
    this.db.prepare("DELETE FROM sessions WHERE expires<?").run(now);
    this.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(digest(token), id, now + 7 * 86400_000);
    return token;
  }
  identity(token?: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const row = this.db
      .prepare("SELECT user_id FROM sessions WHERE token=? AND expires>?")
      .get(digest(token), Date.now());
    return row ? String(row.user_id) : null;
  }
  logout(token: string) {
    this.db.prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
  }
  private full(id: string) {
    const account = this.account(id);
    const own = JSON.parse(account.personal) as AppState;
    const world = JSON.parse(
      String(this.db.prepare("SELECT data FROM world WHERE id=1").get()!.data),
    ) as AppState;
    return syncCommunities({
      ...world,
      ...own,
      accountMode: "local",
      platformAdmin: !!account.admin && own.profile.age === "adult",
    });
  }
  private write(id: string, state: AppState) {
    this.db
      .prepare("UPDATE accounts SET personal=? WHERE id=?")
      .run(JSON.stringify(personal(state)), id);
    const world = { ...state };
    delete world.connectionPeople;
    delete world.schoolDirectory;
    // Own profile, preferences, block list and notifications never enter shared storage.
    for (const k of personalKeys)
      delete (world as unknown as Record<string, unknown>)[k];
    this.db
      .prepare("UPDATE world SET data=? WHERE id=1")
      .run(JSON.stringify(world));
  }
  read(id: string): AppState {
    const s = this.full(id);
    if (!s.profile.onboarded)
      return {
        ...empty(id),
        profile: s.profile,
        accountMode: "local",
        schoolDirectory: s.hubs
          .filter(
            (h) =>
              h.approved && ["school", "university"].includes(h.kind ?? ""),
          )
          .map(({ id, name, city, kind }) => ({ id, name, city, kind: kind! })),
      };
    const blocked = new Set(s.blocked);
    for (const row of this.db
      .prepare("SELECT id,personal FROM accounts")
      .all()) {
      if ((JSON.parse(String(row.personal)).blocked as string[]).includes(id))
        blocked.add(String(row.id));
    }
    s.blocked = [...blocked];
    s.connectionPeople = this.socialPeople(id, s);
    s.schoolDirectory = s.hubs
      .filter(
        (h) =>
          h.approved &&
          h.visibility === "private" &&
          ["school", "university"].includes(h.kind ?? "") &&
          (s.profile.age === "adult" || h.youthApproved),
      )
      .map(({ id, name, city, kind }) => ({ id, name, city, kind: kind! }));
    Object.assign(s, visibleSocial(s));
    s.hubs = s.hubs.filter((h) => canReadHub(s, h) || s.platformAdmin);
    s.sparks = s.sparks.filter((a) => canReadSpark(s, a));
    s.sparks = s.sparks.map((a) =>
      a.ownerId === id ? a : { ...a, bookingReference: "" },
    );
    const sparkIds = new Set(s.sparks.map((a) => a.id));
    s.impact = demoImpact(s);
    s.candidates = s.candidates.filter(
      (c) =>
        !blocked.has(c.ownerId) &&
        (c.ownerId === id ||
          (c.optedIn &&
            (c.approved || s.hubs.some((h) => h.id === c.hubId && h.admin)) &&
            (c.hubId
              ? s.joined.includes(c.hubId)
              : s.profile.age === "adult" && c.age === "adult"))),
    );
    s.proposals = s.proposals.filter(
      (p) =>
        sparkIds.has(p.sparkId) &&
        (s.sparks.some(
          (a) =>
            a.id === p.sparkId &&
            (a.ownerId === id || a.participantIds.includes(id)),
        ) ||
          p.actions.some((a) => a.ownerId === id)),
    );
    s.hubMembers = s.hubs.flatMap((h) => safeDirectory(s, h.id));
    s.hubInvites = [];
    s.membershipRequests = s.membershipRequests?.filter(
      (m) =>
        m.userId === id ||
        s.hubs.some(
          (h) => h.id === m.hubId && (h.admin || h.role === "organizer"),
        ),
    );
    s.participationRequests = s.participationRequests?.filter(
      (r) =>
        r.userId === id ||
        s.sparks.some((a) => a.id === r.sparkId && a.ownerId === id),
    );
    s.reports = s.platformAdmin
      ? s.reports
      : s.reports.filter(
          (r) =>
            r.reporterId === id ||
            s.sparks.some(
              (a) =>
                a.id === r.sparkId &&
                s.hubs.some((h) => h.id === a.hubId && h.admin),
            ),
        );
    s.attendance = s.attendance?.filter((a) => sparkIds.has(a.sparkId));
    s.declines = s.declines?.filter((a) => sparkIds.has(a.sparkId));
    s.impact.registered =
      s.profile.age === "adult"
        ? Number(
            this.db
              .prepare(
                "SELECT count(*) AS n FROM accounts WHERE json_extract(personal,'$.profile.onboarded')=1 AND json_extract(personal,'$.profile.age')='adult'",
              )
              .get()?.n,
          )
        : new Set((s.hubMembers ?? []).map((m) => m.userId)).size;
    return s;
  }
  directory(id: string, hubId: string) {
    const s = this.full(id),
      hub = s.hubs.find((h) => h.id === hubId);
    if (!hub || !canReadHub(s, hub))
      throw new Error("This community is unavailable.");
    const manager = hub.admin || hub.role === "organizer";
    return {
      members: safeDirectory(s, hubId),
      invites: manager
        ? this.db
            .prepare(
              "SELECT hash AS id, hub_id AS hubId, expires, used FROM invites WHERE hub_id=?",
            )
            .all(hubId)
            .map((i) => ({
              id: i.id,
              hubId: i.hubId,
              expiresAt: new Date(Number(i.expires)).toISOString(),
              used: !!i.used,
            }))
        : [],
    };
  }
  invite(id: string, hubId: string) {
    const s = this.full(id);
    if (
      !s.hubs.some((h) => h.id === hubId && (h.admin || h.role === "organizer"))
    )
      throw new Error(
        "Only a community administrator or organizer can create invitations.",
      );
    const code = randomBytes(12).toString("hex").toUpperCase();
    this.db
      .prepare("INSERT INTO invites VALUES(?,?,?,0)")
      .run(digest(code), hubId, Date.now() + 7 * 86400_000);
    return { code };
  }
  mutate(id: string, op: Operation, payload: Record<string, unknown> = {}) {
    return this.transaction(() => {
      const s = this.full(id),
        p = { ...payload },
        target = String(p.id ?? "");
      if (op === "withdraw") delete p.userId;
      const spark = s.sparks.find((a) => a.id === target);
      const own = spark?.ownerId === id;
      const hub = s.hubs.find((h) => h.id === target);
      const manager = (hubId: string | null | undefined) =>
        s.hubs.some(
          (h) => h.id === hubId && (h.admin || h.role === "organizer"),
        );
      // Blocks work in both directions when matching, without changing either
      // account’s private saved block list.
      const ownBlocks = [...s.blocked];
      for (const row of this.db
        .prepare("SELECT id,personal FROM accounts")
        .all()) {
        if ((JSON.parse(String(row.personal)).blocked as string[]).includes(id))
          s.blocked.push(String(row.id));
      }
      if (!s.profile.onboarded && op !== "profile")
        throw new Error("Complete your profile first.");
      s.connectionPeople = this.socialPeople(id, s);
      if (isSocialOperation(op)) {
        // Shared social state is authorized again inside applySocial.
      } else if (op === "profile") {
        const profile = profileSchema.parse(p);
        if (s.profile.onboarded && profile.age !== s.profile.age)
          throw new Error(
            "Age group cannot change after setup. Contact the administrator to correct it.",
          );
      } else if (op === "nearby") nearbySchema.parse(p);
      else if (op === "createSpark" || op === "updateSpark") {
        const data = sparkSchema.parse(p);
        if (
          data.hubId &&
          !s.hubs.some(
            (h) =>
              h.id === data.hubId &&
              s.joined.includes(h.id) &&
              (data.draft || h.approved),
          )
        )
          throw new Error(
            "Choose a community you have joined and that is approved for activities.",
          );
        if (
          data.category === "tutoring" &&
          !s.hubs.some(
            (h) =>
              h.id === data.hubId &&
              h.visibility === "private" &&
              h.youthApproved,
          )
        )
          throw new Error("Peer tutoring requires an approved private hub.");
        if (op === "updateSpark" && !own)
          throw new Error("Only the organizer can edit this activity.");
      } else if (
        [
          "unlock",
          "send",
          "confirm",
          "cancel",
          "complete",
          "deleteSpark",
          "publishSpark",
        ].includes(op)
      ) {
        if (!own || !spark || !canReadSpark(s, spark))
          throw new Error(
            "Only this activity’s organizer can make that change.",
          );
      } else if (op === "respond") {
        const action = s.proposals
          .find((a) => a.sparkId === target)
          ?.actions.find((a) => a.id === p.actionId);
        if (!action || action.ownerId !== id)
          throw new Error(
            "Only the invited person can respond to their invitation.",
          );
      } else if (op === "join") {
        if (
          !hub &&
          (!spark ||
            !canReadSpark(s, spark) ||
            (spark.hubId && !s.joined.includes(spark.hubId)))
        )
          throw new Error(
            "Join the community before requesting participation.",
          );
      } else if (op === "redeem") {
        const code = z
          .string()
          .min(8)
          .max(80)
          .parse(p.code)
          .trim()
          .toUpperCase();
        const row = this.db
          .prepare(
            "SELECT * FROM invites WHERE hash=? AND used=0 AND expires>?",
          )
          .get(digest(code), Date.now());
        if (!row)
          throw new Error(
            "That invitation has expired, was used, or is invalid.",
          );
        s.hubInvites = [
          {
            id: String(row.hash),
            hubId: String(row.hub_id),
            code,
            expiresAt: new Date(Number(row.expires)).toISOString(),
            used: false,
          },
        ];
        this.db
          .prepare("UPDATE invites SET used=1 WHERE hash=?")
          .run(digest(code));
      } else if (op === "createHub") hubSchema.parse(p);
      else if (
        ["communityManage", "approve", "approveParticipation"].includes(op)
      ) {
        /* checked domain actions */
      } else if (op === "approveHub" || op === "resolveReport") {
        if (!s.platformAdmin || s.profile.age !== "adult")
          throw new Error("Platform administrator access is required.");
      } else if (op === "approveTutor" || op === "approveOffer") {
        const c = s.candidates.find((c) => c.id === target);
        if (!manager(op === "approveTutor" ? target : c?.hubId))
          throw new Error("Community administrator access is required.");
      } else if (op === "offer") {
        z.object({
          label: z.string().min(3).max(100),
          kind: z.enum([
            "participant",
            "tutor",
            "facilitator",
            "racket",
            "room",
            "venue",
            "projector",
          ]),
          city: z.string().max(80),
          hubId: z.uuid().nullable(),
          skills: z.array(z.string().max(60)).max(10),
          quantity: z.number().int().min(1).max(30),
          capacity: z.number().int().min(1).max(100),
          cost: z.number().min(0).max(5000),
          windows: z
            .array(
              z
                .object({
                  start: z.iso.datetime({ offset: true }),
                  end: z.iso.datetime({ offset: true }),
                })
                .refine((w) => Date.parse(w.end) > Date.parse(w.start)),
            )
            .min(1)
            .max(12),
          needs: z
            .array(
              z.object({
                id: z.string().max(60),
                kind: z.enum(["racket", "room", "venue", "projector"]),
                quantity: z.number().int().min(1).max(30),
              }),
            )
            .max(5),
        }).parse(p);
        if (p.hubId && !s.joined.includes(String(p.hubId)))
          throw new Error("Join this community before offering a resource.");
        if (!p.hubId && (s.profile.age !== "adult" || p.kind === "tutor"))
          throw new Error(
            "Peer tutors and student offers belong in approved private communities.",
          );
        if (
          ["participant", "tutor", "facilitator"].includes(String(p.kind)) &&
          p.quantity !== 1
        )
          throw new Error("A person can occupy only one participation slot.");
      } else if (
        op === "removeOffer" ||
        op === "readNotifications" ||
        op === "block"
      ) {
        /* owner/own state checks in domain action */
      } else if (["save", "report", "withdraw", "attendance"].includes(op)) {
        if (!spark || !canReadSpark(s, spark))
          throw new Error("Activity unavailable.");
      } else if (op !== "portfolio")
        throw new Error("That operation is not available.");
      if (op === "confirm" && spark) {
        const proposal = s.proposals.find((p) => p.sparkId === spark.id);
        if (!proposal?.window)
          throw new Error("Run UNLOCK again before confirming.");
        for (const action of proposal.actions) {
          const candidate = s.candidates.find(
            (c) => c.id === action.candidateId,
          );
          if (
            !candidate ||
            !eligible(spark, candidate, proposal.window, s.blocked) ||
            (candidate.hubId &&
              !s.hubMembers?.some(
                (m) =>
                  m.hubId === candidate.hubId &&
                  m.userId === candidate.ownerId &&
                  m.status === "approved",
              ))
          )
            throw new Error(
              "An offer is no longer eligible. Run UNLOCK again.",
            );
          if (
            ["participant", "tutor", "facilitator"].includes(action.kind) &&
            s.sparks.some(
              (a) =>
                a.id !== spark.id &&
                ["CONFIRMED", "COMPLETED"].includes(a.status) &&
                a.participantIds.includes(action.ownerId) &&
                a.windows.some((w) => overlaps(w, proposal.window!)),
            )
          )
            throw new Error(
              "An invited person has another confirmed session at this time.",
            );
        }
      }
      // Never let the portfolio modify another organizer’s activities.
      const others =
        op === "portfolio" ? s.sparks.filter((a) => a.ownerId !== id) : [];
      if (op === "portfolio")
        s.sparks = s.sparks.filter((a) => a.ownerId === id);
      const next = applyDemo(s, op, p);
      next.blocked =
        op === "block"
          ? ownBlocks.includes(target)
            ? ownBlocks.filter((x) => x !== target)
            : [...ownBlocks, target]
          : ownBlocks;
      if (op === "portfolio") next.sparks.push(...others);
      if (op === "offer") {
        const offer = next.candidates.at(-1)!;
        offer.approved = offer.hubId
          ? manager(offer.hubId) && offer.kind !== "tutor"
          : offer.kind !== "tutor";
      }
      next.hubInvites = [];
      if (op === "send" && spark) {
        next.notifications[0] = {
          id: randomUUID(),
          text: `Invitations sent for ${spark.title}. Each person must give their own approval.`,
          href: `/groups/${spark.id}`,
          read: false,
        };
        for (const userId of new Set(
          next.proposals
            .find((p) => p.sparkId === spark.id)
            ?.actions.map((a) => a.ownerId),
        )) {
          if (userId === id) continue;
          const other = JSON.parse(this.account(userId).personal) as AppState;
          other.notifications.unshift({
            id: randomUUID(),
            text: `You have an invitation for ${spark.title}.`,
            href: `/groups/${spark.id}`,
            read: false,
          });
          this.db
            .prepare("UPDATE accounts SET personal=? WHERE id=?")
            .run(JSON.stringify(personal(other)), userId);
        }
      }
      this.write(id, next);
      return { ok: true };
    });
  }
  private socialPeople(id: string, s: AppState): ConnectionPerson[] {
    return this.db
      .prepare("SELECT id,personal FROM accounts WHERE id<>?")
      .all(id)
      .flatMap((row) => {
        const other = JSON.parse(String(row.personal)) as AppState;
        const p = other.profile;
        if (
          !p.onboarded ||
          p.age !== s.profile.age ||
          s.blocked.includes(p.id) ||
          other.blocked.includes(id)
        )
          return [];
        const sharedHubIds = (s.hubMembers ?? [])
          .filter(
            (m) =>
              m.userId === p.id &&
              m.status === "approved" &&
              s.joined.includes(m.hubId) &&
              s.hubs.some(
                (h) =>
                  h.id === m.hubId &&
                  h.approved &&
                  (p.age === "adult" ||
                    (h.youthApproved && h.visibility === "private")),
              ),
          )
          .map((m) => m.hubId);
        const existing = s.connections?.some(
          (c) =>
            c.status !== "declined" &&
            [c.requesterId, c.addresseeId].includes(id) &&
            [c.requesterId, c.addresseeId].includes(p.id),
        );
        if (
          !existing &&
          !(sharedHubIds.length && p.hubDirectoryVisible) &&
          !(p.age === "adult" && p.discoverable)
        )
          return [];
        if (p.age === "youth" && !sharedHubIds.length) return [];
        return [
          {
            id: p.id,
            name: p.name,
            city: p.city,
            age: p.age,
            interests: p.interests,
            sharedHubIds,
          },
        ];
      });
  }
  people(id: string) {
    const s = this.full(id);
    if (s.profile.age !== "adult") return [];
    return this.db
      .prepare("SELECT id,personal FROM accounts WHERE id<>?")
      .all(id)
      .flatMap((r) => {
        const account = JSON.parse(String(r.personal)) as AppState,
          p: Profile = account.profile;
        if (
          p.age !== "adult" ||
          !p.onboarded ||
          !account.nearbySettings?.visible ||
          !account.nearbySettings.areaId ||
          s.blocked.includes(p.id) ||
          account.blocked.includes(id)
        )
          return [];
        return [
          {
            id: p.id,
            name: p.name.split(" ")[0],
            areaId: account.nearbySettings.areaId,
            bio: account.nearbySettings.bio,
            interests: p.interests,
            subjects: p.subjects,
            availability: p.availability,
            experience: p.experience,
          },
        ];
      });
  }
}
