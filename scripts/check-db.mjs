import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import fs from "node:fs";
const db = new PGlite({ extensions: { btree_gist } });
await db.exec(
  "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
);
const sql = fs.readFileSync(
  "supabase/migrations/202610180001_afterbell.sql",
  "utf8",
);
try {
  await db.exec(sql);
  console.log("Migration OK");
} catch (e) {
  for (const key of [
    "message",
    "position",
    "internalPosition",
    "internalQuery",
    "where",
    "detail",
  ])
    if (e[key]) console.log(key, e[key]);
  if (e.position) {
    const pos = Number(e.position);
    console.log(
      "Near line",
      sql.slice(0, pos).split("\n").length,
      sql.slice(Math.max(0, pos - 500), pos + 120),
    );
  }
  process.exitCode = 1;
} finally {
  await db.close();
}
