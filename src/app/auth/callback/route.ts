import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const client = await serverClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(
        new URL(
          request.nextUrl.searchParams.get("recovery") === "1"
            ? "/auth?mode=update"
            : "/onboarding",
          request.url,
        ),
      );
      response.cookies.delete("afterbell-demo");
      return response;
    }
  }
  return NextResponse.redirect(
    new URL("/auth?error=verification", request.url),
  );
}
