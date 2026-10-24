import { Landing } from "@/components/landing";
import { cookies } from "next/headers";
import { localEnabled, localIdentity } from "@/lib/local-runtime";
import { configured, currentUser } from "@/lib/supabase/server";
export default async function Home() {
  const demo =
    process.env.NEXT_PUBLIC_ENABLE_DEMO !== "false" &&
    (await cookies()).get("afterbell-demo")?.value === "1";
  const signedIn =
    demo ||
    !!(localEnabled()
      ? await localIdentity()
      : configured()
        ? await currentUser()
        : null);
  return <Landing signedIn={signedIn} />;
}
