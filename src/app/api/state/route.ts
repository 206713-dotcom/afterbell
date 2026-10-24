import { NextResponse } from "next/server";
import { currentUser, serverClient } from "@/lib/supabase/server";
import {
  localEnabled,
  localIdentity,
  localAccounts,
} from "@/lib/local-runtime";
export async function GET() {
  try {
    if (localEnabled()) {
      const id = await localIdentity();
      return id
        ? NextResponse.json(localAccounts().read(id), {
            headers: { "Cache-Control": "private, no-store" },
          })
        : NextResponse.json(
            { error: "Log in to access your community." },
            { status: 401 },
          );
    }
    if (!(await currentUser()))
      return NextResponse.json(
        { error: "Log in to access your community." },
        { status: 401 },
      );
    const client = await serverClient();
    const [
      { data, error },
      { data: nearbySettings },
      { data: workspace, error: workspaceError },
      { data: social, error: socialError },
    ] = await Promise.all([
      client.rpc("afterbell_state"),
      client.rpc("afterbell_nearby_settings"),
      client.rpc("afterbell_workspace_v2"),
      client.rpc("afterbell_social_state"),
    ]);
    if (error || socialError || workspaceError) {
      console.error(
        "State read failed",
        error?.code ?? socialError?.code ?? workspaceError?.code,
      );
      return NextResponse.json(
        {
          error:
            "Your community couldn't load. Check that the AfterBell database migration has been applied.",
        },
        { status: 503 },
      );
    }
    if (!data?.profile)
      return NextResponse.json(
        {
          error:
            "Your profile is missing. Ask an administrator to check database setup.",
        },
        { status: 503 },
      );
    return NextResponse.json(
      {
        ...data,
        ...(social
          ? {
              connections: social.connections,
              connectionPeople: social.connectionPeople,
              messages: social.messages,
              schoolDirectory: social.schoolDirectory,
            }
          : {}),
        ...(nearbySettings ? { nearbySettings } : {}),
        ...(workspace
          ? {
              profile: {
                ...data.profile,
                schoolHubId: social?.schoolHubId ?? null,
                hubDirectoryVisible: workspace.hubDirectoryVisible,
                preferredActivities: workspace.preferredActivities,
              },
              hubs: data.hubs.map((h: { id: string }) => ({
                ...h,
                ...workspace.hubs.find(
                  (extra: { id: string }) => extra.id === h.id,
                ),
              })),
              sparks: data.sparks.map((s: { id: string }) => ({
                ...s,
                ...workspace.sparks.find(
                  (extra: { id: string }) => extra.id === s.id,
                ),
              })),
              memberships: workspace.memberships,
              participationRequests: workspace.participationRequests,
              impact: workspace.impact,
            }
          : {}),
      },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Live database configuration is unavailable. Try the local demo.",
      },
      { status: 503 },
    );
  }
}
