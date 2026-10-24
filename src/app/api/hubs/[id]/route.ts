import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, serverClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security";
import {
  localEnabled,
  localIdentity,
  localAccounts,
} from "@/lib/local-runtime";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: NextRequest, context: Context) {
  if (localEnabled()) {
    const user = await localIdentity();
    if (!user)
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    try {
      return NextResponse.json(
        localAccounts().directory(user, (await context.params).id),
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } catch {
      return NextResponse.json(
        { error: "Community unavailable." },
        { status: 403 },
      );
    }
  }
  if (!(await currentUser()))
    return NextResponse.json(
      { error: "Log in to access your community." },
      { status: 401 },
    );
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success)
    return NextResponse.json(
      { error: "Community unavailable." },
      { status: 404 },
    );
  const client = await serverClient();
  const { data, error } = await client.rpc("afterbell_hub_details", { h: id });
  if (error)
    return NextResponse.json(
      { error: "This community is unavailable or you do not have access." },
      { status: 403 },
    );
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function POST(request: NextRequest, context: Context) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (localEnabled()) {
    const user = await localIdentity();
    if (!user)
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    try {
      const input = z
        .object({
          action: z.enum(["approve", "reject", "role", "remove", "transfer"]),
          userId: z.uuid(),
          role: z.enum(["hub_admin", "organizer", "member"]).optional(),
        })
        .parse(await request.json());
      return NextResponse.json(
        localAccounts().mutate(user, "communityManage", {
          ...input,
          id: (await context.params).id,
        }),
      );
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Unable to manage membership.",
        },
        { status: 403 },
      );
    }
  }
  if (!(await currentUser()))
    return NextResponse.json(
      { error: "Log in to manage your community." },
      { status: 401 },
    );
  try {
    const { id } = await context.params;
    z.uuid().parse(id);
    const raw = await request.text();
    if (raw.length > 2000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const input = z
      .object({
        action: z.enum(["approve", "reject", "role", "remove", "transfer"]),
        userId: z.uuid(),
        role: z.enum(["hub_admin", "organizer", "member"]).optional(),
      })
      .parse(JSON.parse(raw));
    const client = await serverClient();
    const { data, error } = await client.rpc("afterbell_manage_hub", {
      h: id,
      action: input.action,
      target: input.userId,
      assigned_role: input.role ?? null,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Choose a valid community operation." },
      { status: 400 },
    );
  }
}
