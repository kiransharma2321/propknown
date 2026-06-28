import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "PropKnown/1.0 (raghupinnelli@gmail.com)",
        },
        next: { revalidate: 3600 },
      }
    );

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { lat, lon, display_name } = data[0];
    return NextResponse.json(
      { lat: parseFloat(lat), lon: parseFloat(lon), display_name },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
