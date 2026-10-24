import type { NextRequest } from "next/server";
/** Compare the browser's Origin with the public Host, not Next's internal bind address. */
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.host === request.headers.get("host")
    );
  } catch {
    return false;
  }
}
