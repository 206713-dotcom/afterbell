import { NextRequest, NextResponse } from "next/server";
import { currentUser, serverClient } from "@/lib/supabase/server";
import { areaById, distanceKm } from "@/lib/locations";
import {
  localEnabled,
  localIdentity,
  localAccounts,
} from "@/lib/local-runtime";
export async function GET(request: NextRequest) {
  if (localEnabled()) {
    const id = await localIdentity();
    if (!id)
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    const area = areaById(request.nextUrl.searchParams.get("area"));
    const radius = Number(request.nextUrl.searchParams.get("radius") ?? 25),
      interest = request.nextUrl.searchParams.get("interest") ?? "";
    if (
      !area ||
      !Number.isInteger(radius) ||
      radius < 1 ||
      radius > 3000 ||
      interest.length > 40
    )
      return NextResponse.json(
        { error: "Choose a supported area and search distance." },
        { status: 400 },
      );
    return NextResponse.json(
      {
        people: localAccounts()
          .people(id)
          .filter((p) => {
            const location = areaById(p.areaId);
            return (
              location &&
              distanceKm(area, location) <= radius &&
              (!interest || p.interests.includes(interest))
            );
          }),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (!(await currentUser()))
    return NextResponse.json(
      { error: "Log in to explore your community." },
      { status: 401 },
    );
  const area = request.nextUrl.searchParams.get("area");
  const radius = Number(request.nextUrl.searchParams.get("radius") ?? 25);
  const interest = request.nextUrl.searchParams.get("interest") ?? "";
  if (
    !areaById(area) ||
    !Number.isInteger(radius) ||
    radius < 1 ||
    radius > 3000 ||
    interest.length > 40
  )
    return NextResponse.json(
      { error: "Choose a supported area and search distance." },
      { status: 400 },
    );
  try {
    const client = await serverClient();
    const { data, error } = await client.rpc("afterbell_nearby", {
      search_area: area,
      radius_km: radius,
      interest_filter: interest,
    });
    if (error) {
      console.error("Nearby discovery failed", error.code);
      throw error;
    }
    return NextResponse.json(
      { people: data ?? [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Nearby discovery isn’t available right now. Please try again later.",
      },
      { status: 503 },
    );
  }
}
