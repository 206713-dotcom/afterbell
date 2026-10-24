import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, serverClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security";
import {
  localEnabled,
  localIdentity,
  localAccounts,
} from "@/lib/local-runtime";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (localEnabled()) {
    const id = await localIdentity();
    if (!id)
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    try {
      const { hubId } = z
        .object({ hubId: z.uuid() })
        .parse(await request.json());
      return NextResponse.json(localAccounts().invite(id, hubId), {
        headers: { "Cache-Control": "no-store" },
      });
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Unable to create invitation.",
        },
        { status: 403 },
      );
    }
  }
  if (!(await currentUser()))
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  try {
    const { hubId } = z.object({ hubId: z.uuid() }).parse(await request.json());
    const code = randomBytes(12).toString("hex").toUpperCase();
    const hash = createHash("sha256").update(code).digest("hex");
    const client = await serverClient();
    const { error } = await client.rpc("create_hub_invite", {
      hub: hubId,
      hashed_code: hash,
    });
    if (error)
      return NextResponse.json(
        { error: "Only a hub administrator can create invitations." },
        { status: 403 },
      );
    return NextResponse.json(
      { code },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid invitation request." },
      { status: 400 },
    );
  }
}
