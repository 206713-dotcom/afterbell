import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType;
  if (token_hash && ["signup", "recovery", "email", "invite"].includes(type)) {
    const client = await serverClient();
    const { error } = await client.auth.verifyOtp({ token_hash, type });
    if (!error) {
      const response = NextResponse.redirect(
        new URL(
          type === "recovery" ? "/auth?mode=update" : "/onboarding",
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
