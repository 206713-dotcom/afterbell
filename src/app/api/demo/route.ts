import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/security";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO === "false")
    return NextResponse.json({ error: "Demo is disabled." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("afterbell-demo", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      request.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("afterbell-demo");
  return response;
}
