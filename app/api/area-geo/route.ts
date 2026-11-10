import { NextRequest, NextResponse } from "next/server";
import { FEATURES } from "@/lib/features";
import { OSM_ATTRIBUTION, geocodeArea, nearbyPlaces, osmEmbedUrl } from "@/lib/geo";

// M7: map centre + nearby places for an area (OpenStreetMap; cached server-side).
// GET /api/area-geo?area=Kokapet&city=Hyderabad
export async function GET(req: NextRequest) {
  if (!FEATURES.maps) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const area = (req.nextUrl.searchParams.get("area") ?? "").trim().slice(0, 80);
  const city = (req.nextUrl.searchParams.get("city") ?? "").trim().slice(0, 80);
  if (!area || !city) return NextResponse.json({ error: "area and city required" }, { status: 400 });
  const center = await geocodeArea(`${area}, ${city}`);
  if (!center) return NextResponse.json({ error: "Location not found on the map." }, { status: 404 });
  const nearby = await nearbyPlaces(center);
  return NextResponse.json(
    { center, mapUrl: osmEmbedUrl(center), nearby, fetchedAt: new Date().toISOString(), attribution: OSM_ATTRIBUTION },
    { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400" } },
  );
}
