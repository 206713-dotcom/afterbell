import "server-only";
import { cookies } from "next/headers";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { LocalAccounts } from "./local-accounts";

export const LOCAL_COOKIE = "afterbell-session";
// A persistent single-machine backend. Never silently activate on serverless hosts.
export const localEnabled = () =>
  !process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.VERCEL &&
  process.env.AFTERBELL_LOCAL_ACCOUNTS !== "false";
const runtime = globalThis as typeof globalThis & {
  afterbellAccounts?: LocalAccounts;
};
export function localAccounts() {
  if (!localEnabled()) throw new Error("Local accounts are unavailable.");
  if (!runtime.afterbellAccounts) {
    const folder = path.join(
      process.cwd(),
      ".local",
      process.env.AFTERBELL_LOCAL_DATA === "browser-tests"
        ? "browser-accounts"
        : "accounts",
    );
    mkdirSync(folder, { recursive: true });
    runtime.afterbellAccounts = new LocalAccounts(
      path.join(folder, "afterbell.sqlite"),
    );
  }
  return runtime.afterbellAccounts;
}
export async function localIdentity() {
  if (!localEnabled()) return null;
  return localAccounts().identity((await cookies()).get(LOCAL_COOKIE)?.value);
}
