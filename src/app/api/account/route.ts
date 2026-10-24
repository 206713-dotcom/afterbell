import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/security";
import { LOCAL_COOKIE, localAccounts, localEnabled } from "@/lib/local-runtime";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (!localEnabled())
    return NextResponse.json(
      { error: "Use the configured sign-in provider." },
      { status: 404 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 3000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const input = z
      .object({
        action: z.enum(["register", "login", "recover", "logout"]),
        email: z.string().max(254).optional(),
        password: z.string().max(128).optional(),
        recoveryKey: z.string().max(60).optional(),
      })
      .parse(JSON.parse(raw));
    const store = localAccounts(),
      old = request.cookies.get(LOCAL_COOKIE)?.value;
    if (input.action === "logout") {
      if (old) store.logout(old);
      const response = NextResponse.json({ ok: true });
      response.cookies.delete(LOCAL_COOKIE);
      response.cookies.delete("afterbell-demo");
      return response;
    }
    const result =
      input.action === "register"
        ? await store.register(input)
        : input.action === "recover"
          ? await store.recover(input)
          : await store.login(input);
    if (old) store.logout(old);
    const response = NextResponse.json(
      {
        ok: true,
        ...("recoveryKey" in result ? { recoveryKey: result.recoveryKey } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(LOCAL_COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 7 * 86400,
    });
    response.cookies.delete("afterbell-demo");
    return response;
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues[0].message
            : e instanceof Error
              ? e.message
              : "Unable to access your account.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
