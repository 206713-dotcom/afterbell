"use client";
import { createBrowserClient } from "@supabase/ssr";
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Live accounts need Supabase configuration. You can explore the local demo now.",
    );
  return createBrowserClient(url, key);
}
