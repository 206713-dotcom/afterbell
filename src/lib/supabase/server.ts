import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export const configured = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export async function serverClient() {
  if (!configured())
    throw new Error(
      "Supabase is not configured. Use the local demo or follow README setup.",
    );
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components cannot write refreshed cookies; proxy handles refresh. */
          }
        },
      },
    },
  );
}
export async function currentUser() {
  if (!configured()) return null;
  const supabase = await serverClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
