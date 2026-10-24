import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
import { unlock } from "../src/lib/engine";
import type { AppState } from "../src/lib/types";
import { areas } from "../src/lib/locations";
const adult = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  youth = "33333333-3333-4333-8333-333333333333",
  admin = "44444444-4444-4444-8444-444444444444";
const privateHub = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  publicSpark = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  privateSpark = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
let db: PGlite;
async function as(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
  await db.exec("set role authenticated");
}
async function mutate(op: string, payload: Record<string, unknown>) {
  return db.query("select afterbell_mutate_v2($1,$2::jsonb) result", [
    op,
    JSON.stringify(payload),
  ]);
}
async function social(op: string, payload: Record<string, unknown>) {
  // Each RPC has its own rollback boundary, as separate HTTP requests would.
  await db.exec("savepoint social_rpc");
  try {
    const result = await db.query<{ result: { id: string } }>(
      "select afterbell_social_mutate($1,$2::jsonb) result",
      [op, JSON.stringify(payload)],
    );
    await db.exec("release savepoint social_rpc");
    return result;
  } catch (error) {
    await db.exec(
      "rollback to savepoint social_rpc;release savepoint social_rpc",
    );
    throw error;
  }
}
async function socialState() {
  return (
    await db.query<{ data: AppState }>("select afterbell_social_state() data")
  ).rows[0].data;
}
async function prepareProposal() {
  await as(other);
  await mutate("offer", {
    label: "An opted-in adult player",
    kind: "participant",
    city: "Petaling Jaya",
    hubId: null,
    skills: [],
    quantity: 1,
    capacity: 1,
    cost: 0,
    needs: [],
    windows: [
      { start: "2026-10-24T09:00:00+08:00", end: "2026-10-24T11:00:00+08:00" },
    ],
  });
  await as(adult);
  const result = await db.query<{ data: AppState }>(
    "select afterbell_state() data",
  );
  const state = result.rows[0].data;
  const proposal = unlock(
    state.sparks.find((s) => s.id === publicSpark)!,
    state.candidates,
  );
  expect(proposal.feasible).toBe(true);
  await mutate("saveProposal", { id: publicSpark, proposal });
  await mutate("send", { id: publicSpark });
  return (await db.query<{ id: string }>("select id from proposal_actions"))
    .rows[0].id;
}
beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await db.exec(
    "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;",
  );
  await db.exec(
    readFileSync("supabase/migrations/202610180001_afterbell.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202610180002_nearby.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202610180003_communities.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202610220004_places.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202610220005_social.sql", "utf8"),
  );
  await db.exec(
    `insert into auth.users(id)values('${adult}'),('${other}'),('${youth}'),('${admin}');update profiles set age='adult',onboarded=true,discoverable=true where id<>'${youth}';update profiles set age='youth',onboarded=true where id='${youth}';insert into platform_admins(user_id)values('${admin}');insert into hubs(id,name,description,city,category,visibility,approved,youth_approved,owner_id)values('${privateHub}','Approved school hub','A moderated school community fixture.','Kuala Lumpur','study','private',true,true,'${adult}');insert into hub_members(hub_id,user_id,role,status)values('${privateHub}','${adult}','hub_admin','approved'),('${privateHub}','${youth}','member','approved');insert into sparks(id,owner_id,hub_id,title,description,category,city,target)values('${publicSpark}','${adult}',null,'Public adult game','An adult-only activity test fixture.','badminton','Petaling Jaya',2),('${privateSpark}','${adult}','${privateHub}','Private school study','An approved school activity fixture.','study','Kuala Lumpur',2);insert into session_participants(spark_id,user_id)values('${publicSpark}','${adult}'),('${privateSpark}','${adult}');insert into spark_requirements(spark_id,kind,quantity)values('${publicSpark}','participant',1),('${privateSpark}','participant',1);insert into availability_slots(spark_id,starts_at,ends_at)values('${publicSpark}','2026-10-24 09:00+08','2026-10-24 11:00+08'),('${privateSpark}','2026-10-24 09:00+08','2026-10-24 11:00+08');`,
  );
}, 60000);
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback;reset role");
});
afterAll(async () => {
  await db?.close();
});
describe("PostgreSQL migration and row-level security", () => {
  it("rejects private youth chats while permitting a shared approved school room", async () => {
    await db.query(
      "update profiles set age='youth',hub_directory_visible=true where id=$1",
      [other],
    );
    await db.query(
      "insert into hub_members(hub_id,user_id,role,status)values($1,$2,'member','approved')",
      [privateHub, other],
    );
    await as(youth);
    const id = (await social("connect", { id: other })).rows[0].result.id;
    await as(other);
    await social("connectionRespond", { id, accept: true });
    await expect(
      social("chatSend", { connectionId: id, body: "Private youth message" }),
    ).rejects.toThrow(/adult/);
    await social("chatSend", { hubId: privateHub, body: "Our school group" });
    await as(youth);
    expect((await socialState()).messages![0].body).toBe("Our school group");
    await expect(social("connect", { id: adult })).rejects.toThrow(
      /not available/,
    );
  });
  it("denies direct message writes and anonymous social state access", async () => {
    await as(adult);
    await db.exec("savepoint direct_message");
    await expect(
      db.query(
        "insert into chat_messages(hub_id,sender_id,body)values($1,$2,'Forged')",
        [privateHub, other],
      ),
    ).rejects.toThrow(/permission/);
    await db.exec(
      "rollback to savepoint direct_message;release savepoint direct_message;reset role;set role anon",
    );
    await expect(db.query("select afterbell_social_state()")).rejects.toThrow(
      /permission/,
    );
  });
  it("requires accepted, reciprocal adult connections and keeps third parties out", async () => {
    await as(adult);
    const id = (await social("connect", { id: other, requesterId: youth }))
      .rows[0].result.id;
    expect((await socialState()).connections![0].requesterId).toBe(adult);
    await expect(
      social("chatSend", { connectionId: id, body: "Too early" }),
    ).rejects.toThrow(/accepted/);
    await expect(
      social("connectionRespond", { id, accept: true }),
    ).rejects.toThrow(/recipient/);
    await as(other);
    await expect(social("connectionRespond", { id })).rejects.toThrow(
      /accept or decline/,
    );
    await social("connectionRespond", { id, accept: true });
    const messageId = (
      await social("chatSend", {
        connectionId: id,
        body: "A real shared message",
        senderId: adult,
      })
    ).rows[0].result.id;
    await as(adult);
    expect((await socialState()).messages![0]).toMatchObject({
      body: "A real shared message",
      senderId: other,
    });
    await expect(social("chatDelete", { id: messageId })).rejects.toThrow(
      /sender/,
    );
    await as(admin);
    expect((await db.query("select * from chat_messages")).rows).toHaveLength(
      0,
    );
    await expect(
      social("chatSend", { connectionId: id, body: "Intruder" }),
    ).rejects.toThrow();
    await as(other);
    await social("chatDelete", { id: messageId });
    expect((await socialState()).messages![0]).toMatchObject({
      body: "",
      removed: true,
    });
    await social("disconnect", { id });
    expect((await socialState()).messages).toHaveLength(0);
  });
  it("treats school selection as a pending request and removes access when membership ends", async () => {
    await db.exec(`update hubs set kind='school'where id='${privateHub}'`);
    await as(adult);
    await social("chatSend", { hubId: privateHub, body: "School welcome" });
    await as(other);
    await social("selectSchool", { id: privateHub });
    expect(
      (
        await db.query<{ status: string }>(
          "select status from hub_members where user_id=$1",
          [other],
        )
      ).rows[0].status,
    ).toBe("pending");
    expect((await socialState()).messages).toEqual([]);
    await expect(
      social("chatSend", { hubId: privateHub, body: "Not approved" }),
    ).rejects.toThrow(/membership/);
    await as(adult);
    await db.query("select afterbell_manage_hub($1,'approve',$2,null)", [
      privateHub,
      other,
    ]);
    await as(other);
    expect((await socialState()).messages![0].body).toBe("School welcome");
    await social("chatSend", { hubId: privateHub, body: "Now approved" });
    await as(adult);
    const messageId = (await socialState()).messages!.find(
      (m) => m.senderId === other,
    )!.id;
    await social("chatDelete", { id: messageId });
    await db.query("select afterbell_manage_hub($1,'remove',$2,null)", [
      privateHub,
      other,
    ]);
    await as(other);
    expect((await socialState()).messages).toEqual([]);
  });
  it("honors both-sided blocks for existing conversations and rejects direct table writes", async () => {
    await as(adult);
    const id = (await social("connect", { id: other })).rows[0].result.id;
    await as(other);
    await social("connectionRespond", { id, accept: true });
    await social("chatSend", { connectionId: id, body: "Before blocking" });
    await mutate("block", { id: adult });
    expect((await db.query("select * from chat_messages")).rows).toEqual([]);
    await as(adult);
    expect((await socialState()).messages).toEqual([]);
    await expect(
      social("chatSend", { connectionId: id, body: "Blocked" }),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into connections(requester_id,addressee_id)values($1,$2)",
        [adult, admin],
      ),
    ).rejects.toThrow(/permission/);
  });
  it("stores a booked court and keeps its reference readable only by the organizer", async () => {
    await as(adult);
    const payload = {
      title: "A booked court in Subang",
      description: "A group game at an operator-booked court.",
      category: "badminton",
      city: "Subang Jaya",
      hubId: null,
      target: 2,
      budget: 0,
      skill: "Intermediate",
      venueId: "subang-racquet-golf-centre",
      spaceLabel: "Court 8",
      bookingStatus: "booked",
      bookingReference: "SECRET-BOOKING",
      windows: [
        {
          start: "2026-11-01T09:00:00+08:00",
          end: "2026-11-01T11:00:00+08:00",
        },
      ],
      requirements: [],
    };
    const { rows } = await db.query<{ result: { id: string } }>(
      "select afterbell_mutate_v3('createSpark',$1::jsonb)result",
      [JSON.stringify(payload)],
    );
    const id = rows[0].result.id;
    expect(
      (
        await db.query<{ reference: string }>(
          "select reference from venue_booking_references where spark_id=$1",
          [id],
        )
      ).rows[0].reference,
    ).toBe("SECRET-BOOKING");
    await as(other);
    expect(
      (await db.query("select * from venue_booking_references")).rows,
    ).toEqual([]);
    const state = (
      await db.query<{ data: { sparks: Record<string, unknown>[] } }>(
        "select afterbell_workspace_v2()data",
      )
    ).rows[0].data;
    expect(state.sparks.find((s) => s.id === id)).toMatchObject({
      spaceLabel: "Court 8",
      bookingStatus: "booked",
      bookingReference: "",
    });
    await as(adult);
    await expect(
      db.query("select afterbell_mutate_v3('updateSpark',$1::jsonb)", [
        JSON.stringify({ ...payload, id, bookingReference: "" }),
      ]),
    ).rejects.toThrow(/reference/);
  });
  it("restricts peer tutoring to approved private hubs at the database boundary", async () => {
    const publicHub = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await db.exec(
      `insert into hubs(id,name,description,city,category,visibility,approved,owner_id)values('${publicHub}','Adult public club','A public adult community used in security tests.','Petaling Jaya','community','public',true,'${adult}');insert into hub_members(hub_id,user_id,role,status)values('${publicHub}','${adult}','hub_admin','approved');`,
    );
    await as(adult);
    await expect(
      mutate("createSpark", { hubId: publicHub, category: "tutoring" }),
    ).rejects.toThrow(/approved private hub/);
  });
  it("allows a participant to withdraw, blocks the activity, and releases reservations", async () => {
    const actionId = await prepareProposal();
    await as(other);
    await mutate("respond", { id: publicSpark, actionId, accept: true });
    await as(adult);
    await mutate("confirm", { id: publicSpark });
    await as(other);
    await mutate("withdraw", { id: publicSpark });
    await as(adult);
    expect(
      (
        await db.query<{ status: string }>(
          "select status from sparks where id=$1",
          [publicSpark],
        )
      ).rows[0].status,
    ).toBe("BLOCKED");
    expect(
      (await db.query("select * from resource_reservations")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from spark_declines")).rows).toHaveLength(
      1,
    );
  });
  it("rejects malformed resource dependencies at the database boundary", async () => {
    await as(other);
    await expect(
      mutate("offer", {
        label: "A malformed player offer",
        kind: "participant",
        city: "Petaling Jaya",
        hubId: null,
        skills: [],
        quantity: 1,
        capacity: 1,
        cost: 0,
        needs: [{ kind: "participant", quantity: -3 }],
        windows: [],
      }),
    ).rejects.toThrow(/well_formed_dependencies/);
  });
  it("executes the real offer → solver → invitation → owner consent → confirmation transaction", async () => {
    const actionId = await prepareProposal();
    await as(other);
    await mutate("respond", { id: publicSpark, actionId, accept: true });
    await as(adult);
    await mutate("confirm", { id: publicSpark });
    const session = await db.query<{ status: string }>(
      "select status from sessions where spark_id=$1",
      [publicSpark],
    );
    expect(session.rows[0].status).toBe("confirmed");
    expect(
      (await db.query("select * from resource_reservations")).rows,
    ).toHaveLength(2);
    await mutate("attendance", { id: publicSpark });
    await mutate("complete", { id: publicSpark });
    expect(
      (await db.query<{ status: string }>("select status from sessions"))
        .rows[0].status,
    ).toBe("completed");
  });
  it("prevents an organizer accepting someone else's invitation", async () => {
    const actionId = await prepareProposal();
    await expect(
      mutate("respond", { id: publicSpark, actionId, accept: true }),
    ).rejects.toThrow(/invited person/);
  });
  it("leaves an unaccepted proposal unconfirmed in the actual database", async () => {
    await prepareProposal();
    await expect(mutate("confirm", { id: publicSpark })).rejects.toThrow(
      /individual approval/,
    );
  });
  it("rechecks resource opt-in when confirmation happens", async () => {
    const actionId = await prepareProposal();
    await as(other);
    await mutate("respond", { id: publicSpark, actionId, accept: true });
    const offer = (
      await db.query<{ id: string }>("select id from resource_offers")
    ).rows[0];
    await mutate("removeOffer", { id: offer.id });
    await as(adult);
    await expect(mutate("confirm", { id: publicSpark })).rejects.toThrow(
      /changed/,
    );
  });
  it("rejects a forged feasible flag even through a direct RPC", async () => {
    await as(adult);
    await mutate("saveProposal", {
      id: publicSpark,
      proposal: {
        feasible: true,
        window: {
          start: "2026-10-24T09:00:00+08:00",
          end: "2026-10-24T11:00:00+08:00",
        },
        actions: [],
      },
    });
    const result = await db.query<{ feasible: boolean }>(
      "select feasible from match_proposals",
    );
    expect(result.rows[0].feasible).toBe(false);
  });
  it("releases reservations when the organizer cancels", async () => {
    const actionId = await prepareProposal();
    await as(other);
    await mutate("respond", { id: publicSpark, actionId, accept: true });
    await as(adult);
    await mutate("confirm", { id: publicSpark });
    await mutate("cancel", { id: publicSpark });
    expect(
      (await db.query("select * from resource_reservations")).rows,
    ).toHaveLength(0);
  });
  it("enables RLS on every application table", async () => {
    const result = await db.query<{ count: number }>(
      "select count(*)::int count from pg_tables where schemaname='public' and not rowsecurity",
    );
    expect(result.rows[0].count).toBe(0);
  });
  it("hides private hub and activities from a nonmember adult", async () => {
    await as(other);
    expect((await db.query("select * from hubs")).rows).toHaveLength(0);
    expect((await db.query("select * from sparks")).rows).toHaveLength(1);
  });
  it("hides public adult matching from youth while allowing their approved school", async () => {
    await as(youth);
    const result = await db.query<{ id: string }>("select id from sparks");
    expect(result.rows.map((r) => r.id)).toEqual([privateSpark]);
  });
  it("does not allow arbitrary table writes or role escalation", async () => {
    await as(other);
    await expect(
      db.exec(`insert into platform_admins(user_id)values('${other}')`),
    ).rejects.toThrow(/permission denied/);
  });
  it("does not expose other people's profile records", async () => {
    await as(other);
    const result = await db.query<{ id: string }>("select id from profiles");
    expect(result.rows.map((r) => r.id)).toEqual([other]);
  });
  it("refuses activity deletion by a different adult", async () => {
    await as(other);
    await expect(mutate("deleteSpark", { id: publicSpark })).rejects.toThrow(
      /organizer/,
    );
  });
  it("prevents a youth user creating a public activity", async () => {
    await as(youth);
    await expect(mutate("createSpark", { hubId: null })).rejects.toThrow(
      /adult/,
    );
  });
  it("prevents self-approval of a public or school hub", async () => {
    await as(other);
    await expect(
      mutate("approveHub", { id: privateHub, youthApproved: true }),
    ).rejects.toThrow(/Platform administrator/);
  });
  it("prevents onboarding from changing an established age category", async () => {
    await as(youth);
    await expect(mutate("profile", { age: "adult" })).rejects.toThrow(
      /moderator/,
    );
  });
  it("returns a structured live state under invoker RLS", async () => {
    await as(other);
    const result = await db.query<{
      data: { sparks: unknown[]; hubs: unknown[]; profile: { id: string } };
    }>("select afterbell_state() data");
    expect(result.rows[0].data.profile.id).toBe(other);
    expect(result.rows[0].data.hubs).toHaveLength(0);
    expect(result.rows[0].data.sparks).toHaveLength(1);
  });
  it("requires every individual approval before confirmation", async () => {
    await as(adult);
    await expect(mutate("confirm", { id: publicSpark })).rejects.toThrow(
      /pending session/,
    );
  });
  it("rejects unsolicited or forged consent", async () => {
    await as(other);
    await expect(
      mutate("respond", {
        id: publicSpark,
        actionId: publicSpark,
        accept: true,
      }),
    ).rejects.toThrow(/invited person/);
  });
  it("isolates a user's saved activities", async () => {
    await as(adult);
    await mutate("save", { id: publicSpark });
    await as(other);
    expect((await db.query("select * from saved_sparks")).rows).toHaveLength(0);
  });
  it("records reports and restricts them to reporter and moderators", async () => {
    await as(other);
    await mutate("report", {
      id: publicSpark,
      reason: "A concern needing moderator review.",
    });
    await as(youth);
    expect((await db.query("select * from reports")).rows).toHaveLength(0);
    await as(admin);
    expect((await db.query("select * from reports")).rows).toHaveLength(1);
  });
  it("prevents overlapping exclusive resource reservations", async () => {
    await db.exec(
      `insert into resource_offers(id,owner_id,label,kind,city)values('${publicSpark}','${adult}','Shared projector','projector','Petaling Jaya');insert into sessions(id,spark_id)values('${privateHub}','${publicSpark}');insert into resource_reservations(offer_id,session_id,starts_at,ends_at)values('${publicSpark}','${privateHub}','2026-10-24 09:00+08','2026-10-24 11:00+08');`,
    );
    await expect(
      db.exec(
        `insert into resource_reservations(offer_id,session_id,starts_at,ends_at)values('${publicSpark}','${privateHub}','2026-10-24 10:00+08','2026-10-24 12:00+08')`,
      ),
    ).rejects.toThrow(/exclusion/);
  });
});

describe("nearby database privacy and access boundaries", () => {
  const list = async (area = "petaling-jaya", radius = 25, interest = "") =>
    (
      await db.query<{
        people: { id: string; name: string; areaId: string; bio: string }[];
      }>("select afterbell_nearby($1,$2,$3) people", [area, radius, interest])
    ).rows[0].people;
  const publish = async (
    areaId = "ss2",
    visible = true,
    bio = "Weekend games and a study circle.",
  ) =>
    db.query("select afterbell_save_nearby($1::jsonb)", [
      JSON.stringify({ areaId, bio, visible }),
    ]);
  it("publishes only through a separate explicit adult opt-in and supports immediate opt-out", async () => {
    await as(adult);
    expect(await list()).toEqual([]);
    await as(other);
    await publish("ss2", false);
    await as(adult);
    expect(await list()).toEqual([]);
    await as(other);
    await publish();
    await as(adult);
    expect((await list()).map((p) => p.id)).toEqual([other]);
    await as(other);
    await publish("ss2", false);
    await as(adult);
    expect(await list()).toEqual([]);
  });
  it("projects only consented fields and a first name, without opening private profile reads", async () => {
    await db.exec(
      `update profiles set display_name='Hana PrivateSurname',interests=array['Badminton'],subjects=array['Maths'] where id='${other}'`,
    );
    await as(other);
    await publish();
    await as(adult);
    const people = await list();
    expect(people[0].name).toBe("Hana");
    expect(Object.keys(people[0]).sort()).toEqual(
      [
        "id",
        "name",
        "areaId",
        "bio",
        "interests",
        "subjects",
        "experience",
        "availability",
      ].sort(),
    );
    expect((await db.query("select id from profiles")).rows).toEqual([
      { id: adult },
    ]);
    expect(JSON.stringify(people)).not.toMatch(
      /PrivateSurname|latitude|longitude|school|email/,
    );
  });
  it("filters broad area distances and declared interests on the server", async () => {
    await db.exec(
      `update profiles set interests=array['Coding'] where id='${other}'`,
    );
    await as(other);
    await publish("kuala-lumpur");
    await as(adult);
    expect(await list("petaling-jaya", 5)).toEqual([]);
    expect((await list("petaling-jaya", 25, "Coding")).length).toBe(1);
    expect(await list("petaling-jaya", 25, "Badminton")).toEqual([]);
  });
  it("honors blocking in both directions and excludes the viewer", async () => {
    await as(other);
    await publish();
    await as(adult);
    await publish();
    expect((await list()).map((p) => p.id)).toEqual([other]);
    await mutate("block", { id: other });
    expect(await list()).toEqual([]);
    await as(other);
    expect(await list()).toEqual([]);
  });
  it("does not let a youth account browse or publish public nearby profiles", async () => {
    await as(other);
    await publish();
    await as(youth);
    expect(await list()).toEqual([]);
    await expect(publish()).rejects.toThrow(/adult accounts/);
  });
  it("hides an already-listed profile if it no longer meets the adult eligibility checks", async () => {
    await as(other);
    await publish();
    await db.exec("reset role");
    await db.query("update profiles set age='youth' where id=$1", [other]);
    await as(adult);
    expect(await list()).toEqual([]);
  });
  it("keeps nearby settings private and prevents direct table changes", async () => {
    await as(other);
    await publish();
    await as(adult);
    expect((await db.query("select * from nearby_profiles")).rows).toEqual([]);
    await expect(
      db.query("update nearby_profiles set visible=false where user_id=$1", [
        other,
      ]),
    ).rejects.toThrow(/permission denied/);
  });
  it("cannot be used anonymously", async () => {
    await db.exec("reset role;set role anon");
    await expect(
      db.query("select afterbell_nearby('petaling-jaya',25,'')"),
    ).rejects.toThrow(/permission denied/);
  });
  it("validates radius and area before returning directory data", async () => {
    await as(adult);
    await expect(list("unknown")).rejects.toThrow(/Unknown search area/);
  });
  it("keeps the database area references identical to the browser references", async () => {
    const values = await db.query<{
      id: string;
      latitude: number;
      longitude: number;
    }>("select id,latitude,longitude from nearby_areas order by id");
    expect(values.rows).toEqual(
      [...areas]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((a) => ({ id: a.id, latitude: a.lat, longitude: a.lng })),
    );
  });
});

describe("nearby direct RPC validation", () => {
  it("rejects invalid search radii through the database API", async () => {
    await as(adult);
    await expect(
      db.query("select afterbell_nearby('petaling-jaya',0,'')"),
    ).rejects.toThrow(/Invalid nearby search/);
  });
  it("saves only the caller’s nearby profile even when another owner is supplied", async () => {
    await as(other);
    await db.query("select afterbell_save_nearby($1::jsonb)", [
      JSON.stringify({
        areaId: "ss2",
        bio: "My broad public intro.",
        visible: true,
        userId: adult,
        latitude: 3.123456789,
        longitude: 101.123456789,
      }),
    ]);
    const settings = (
      await db.query<{ value: unknown }>(
        "select afterbell_nearby_settings() value",
      )
    ).rows[0].value;
    expect(settings).toEqual({
      areaId: "ss2",
      bio: "My broad public intro.",
      visible: true,
    });
    await db.exec("reset role");
    expect(
      (await db.query("select user_id from nearby_profiles")).rows,
    ).toEqual([{ user_id: other }]);
  });
  it("rejects a location outside the supported broad-area catalogue", async () => {
    await as(adult);
    await expect(
      db.query("select afterbell_save_nearby($1::jsonb)", [
        JSON.stringify({
          areaId: "arbitrary-street-address",
          bio: "",
          visible: true,
        }),
      ]),
    ).rejects.toThrow(/foreign key/);
  });
});

describe("community workspace authorization", () => {
  it("saves and confirms a feasible facilitator proposal with person reservations", async () => {
    await db.exec(
      `update spark_requirements set kind='facilitator' where spark_id='${publicSpark}'`,
    );
    await as(other);
    await mutate("offer", {
      label: "One opted-in facilitator",
      kind: "facilitator",
      city: "Petaling Jaya",
      hubId: null,
      skills: [],
      quantity: 1,
      capacity: 1,
      cost: 0,
      needs: [],
      windows: [
        {
          start: "2026-10-24T09:00:00+08:00",
          end: "2026-10-24T11:00:00+08:00",
        },
      ],
    });
    await as(adult);
    const { rows } = await db.query<{ data: AppState }>(
      "select afterbell_state() data",
    );
    const proposal = unlock(
      rows[0].data.sparks.find((s) => s.id === publicSpark)!,
      rows[0].data.candidates,
    );
    expect(proposal.feasible).toBe(true);
    expect(proposal.actions).toHaveLength(1);
    await mutate("saveProposal", { id: publicSpark, proposal });
    await mutate("send", { id: publicSpark });
    const action = (
      await db.query<{ id: string }>("select id from proposal_actions")
    ).rows[0];
    await as(other);
    await mutate("respond", {
      id: publicSpark,
      actionId: action.id,
      accept: true,
    });
    await as(adult);
    await mutate("confirm", { id: publicSpark });
    expect(
      (
        await db.query(
          "select user_id from session_participants where spark_id=$1 and user_id=$2",
          [publicSpark, other],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("returns real scoped impact metrics and own memberships", async () => {
    await as(youth);
    const { rows } = await db.query<{
      data: {
        impact: { sparksCreated: number };
        memberships: { hubId: string }[];
        sparks: { id: string }[];
      };
    }>("select afterbell_workspace() data");
    expect(rows[0].data.impact.sparksCreated).toBe(1);
    expect(rows[0].data.memberships.map((m) => m.hubId)).toEqual([privateHub]);
    expect(rows[0].data.sparks.map((s) => s.id)).toEqual([privateSpark]);
  });
  it("returns private member placeholders without exposing age or email", async () => {
    await as(youth);
    const { rows } = await db.query<{
      data: { members: { userId: string; name: string }[]; invites: unknown[] };
    }>("select afterbell_hub_details($1) data", [privateHub]);
    expect(rows[0].data.members.find((m) => m.userId === adult)?.name).toBe(
      "Private member",
    );
    expect(JSON.stringify(rows[0].data)).not.toMatch(/email|age|recovery/);
    expect(rows[0].data.invites).toEqual([]);
  });
  it("rejects a private directory read from another account", async () => {
    await as(other);
    await expect(
      db.query("select afterbell_hub_details($1)", [privateHub]),
    ).rejects.toThrow(/access|unavailable/i);
  });
  it("prevents member role escalation", async () => {
    await as(youth);
    await expect(
      db.query("select afterbell_manage_hub($1,'role',$2,'hub_admin')", [
        privateHub,
        youth,
      ]),
    ).rejects.toThrow(/administrator|manage|organizer/i);
  });
  it("protects the community owner from demotion", async () => {
    await as(adult);
    await expect(
      db.query("select afterbell_manage_hub($1,'role',$2,'member')", [
        privateHub,
        adult,
      ]),
    ).rejects.toThrow(/ownership|owner/i);
  });
  it("creates a structured draft visible only to its organizer and publishes it", async () => {
    await as(adult);
    const result = await mutate("createSpark", {
      title: "A new private revision plan",
      description: "An account-owned draft with structured academic details.",
      category: "study",
      city: "Petaling Jaya",
      hubId: null,
      target: 2,
      skill: "Maths",
      subject: "Maths",
      academicLevel: "IGCSE",
      learningGoals: "Understand algebra",
      budget: 0,
      draft: true,
      windows: [
        {
          start: "2026-11-01T09:00:00+08:00",
          end: "2026-11-01T11:00:00+08:00",
        },
      ],
      requirements: [],
    });
    const id = (result.rows[0] as { result: { id: string } }).result.id;
    await as(other);
    expect(
      (await db.query("select * from sparks where id=$1", [id])).rows,
    ).toHaveLength(0);
    await as(adult);
    await mutate("publishSpark", { id });
    await as(other);
    const { rows } = await db.query<{ subject: string; status: string }>(
      "select subject,status from sparks where id=$1",
      [id],
    );
    expect(rows[0]).toEqual({ subject: "Maths", status: "BLOCKED" });
  });
  it("treats facilitator capacity as a single person at the database boundary", async () => {
    await as(other);
    await expect(
      mutate("offer", {
        label: "Invalid two-person facilitator",
        kind: "facilitator",
        city: "Petaling Jaya",
        hubId: null,
        skills: [],
        quantity: 2,
        capacity: 1,
        cost: 0,
        needs: [],
        windows: [
          {
            start: "2026-11-01T09:00:00+08:00",
            end: "2026-11-01T11:00:00+08:00",
          },
        ],
      }),
    ).rejects.toThrow(/person|constraint|capacity/i);
  });
});
