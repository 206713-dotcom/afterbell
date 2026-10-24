import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { currentUser, configured, serverClient } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";
import { Auth } from "@/components/auth";
import { Dashboard } from "@/components/dashboard";
import { Explore } from "@/components/explore";
import { Onboarding, ProfilePage, Settings } from "@/components/preferences";
import { SparkCreate } from "@/components/spark-form";
import { SparkDetail } from "@/components/spark-detail";
import { UnlockLab } from "@/components/unlock-lab";
import { GroupRoom } from "@/components/group-room";
import { Hubs, HubDetail } from "@/components/hubs";
import { Nearby } from "@/components/nearby";
import { PlansPage } from "@/components/plans-page";
import { ImpactPage } from "@/components/impact-page";
import { PlacesPage } from "@/components/places";
import { SchoolsPage, ConnectionsPage } from "@/components/social";
import {
  localEnabled,
  localIdentity,
  localAccounts,
} from "@/lib/local-runtime";
export default async function AppPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { path } = await params;
  const query = await searchParams;
  const route = path.join("/");
  if (route === "auth")
    return (
      <Auth
        configured={configured()}
        local={localEnabled()}
        initialMode={query.mode}
        initialError={!!query.error}
      />
    );
  const valid =
    [
      "dashboard",
      "plans",
      "impact",
      "places",
      "schools",
      "connections",
      "onboarding",
      "explore",
      "nearby",
      "study",
      "tutoring",
      "badminton",
      "hubs",
      "unlock",
      "profile",
      "settings",
      "sparks/create",
    ].includes(route) ||
    (path.length === 2 &&
      ["sparks", "hubs", "unlock", "groups"].includes(path[0])) ||
    (path.length === 3 && path[0] === "sparks" && path[2] === "edit");
  if (!valid) notFound();
  const jar = await cookies();
  const demo =
    process.env.NEXT_PUBLIC_ENABLE_DEMO !== "false" &&
    jar.get("afterbell-demo")?.value === "1";
  if (!demo) {
    if (localEnabled()) {
      const id = await localIdentity();
      if (!id) redirect("/auth");
      const profile = localAccounts().read(id).profile;
      if (!profile.onboarded && route !== "onboarding") redirect("/onboarding");
      if (profile.onboarded && route === "onboarding") redirect("/dashboard");
    } else {
      const user = await currentUser();
      if (!user) redirect("/auth");
      const client = await serverClient();
      const { data } = await client
        .from("profiles")
        .select("onboarded")
        .eq("id", user.id)
        .single();
      if (data && !data.onboarded && route !== "onboarding")
        redirect("/onboarding");
      if (data?.onboarded && route === "onboarding") redirect("/dashboard");
    }
  }
  if (route === "onboarding") return <Onboarding />;
  const page =
    route === "dashboard" ? (
      <Dashboard />
    ) : route === "plans" ? (
      <PlansPage initialView={query.view} />
    ) : route === "impact" ? (
      <ImpactPage />
    ) : route === "places" ? (
      <PlacesPage />
    ) : route === "schools" ? (
      <SchoolsPage />
    ) : route === "connections" ? (
      <ConnectionsPage />
    ) : route === "nearby" ? (
      <Nearby />
    ) : route === "explore" ? (
      <Explore key={`explore-${query.q ?? "all"}`} initialQuery={query.q} />
    ) : route === "study" || route === "badminton" || route === "tutoring" ? (
      <Explore key={route} initialCategory={route} />
    ) : route === "hubs" ? (
      <Hubs
        key={query.new ?? "list"}
        initialCreateSchool={query.new === "school"}
      />
    ) : route === "unlock" ? (
      <UnlockLab key="lab" />
    ) : route === "profile" ? (
      <ProfilePage />
    ) : route === "settings" ? (
      <Settings />
    ) : route === "sparks/create" ? (
      <SparkCreate
        initialHubId={query.hub}
        initialVenueId={query.venue}
        initialCategory={query.category}
      />
    ) : path[0] === "sparks" ? (
      <SparkDetail
        key={path.slice(1).join("/")}
        id={path[1]}
        edit={path[2] === "edit"}
      />
    ) : path[0] === "hubs" ? (
      <HubDetail
        key={`${path[1]}-${query.tab ?? "activities"}`}
        id={path[1]}
        initialTab={query.tab}
      />
    ) : path[0] === "groups" ? (
      <GroupRoom key={path[1]} id={path[1]} />
    ) : path[0] === "unlock" ? (
      <UnlockLab key={path[1]} id={path[1]} />
    ) : null;
  return <Shell>{page}</Shell>;
}
