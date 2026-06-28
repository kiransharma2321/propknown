import { NextRequest, NextResponse } from "next/server";

interface NomItem {
  display_name: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "PropKnown/1.0 (raghupinnelli@gmail.com)",
        },
        next: { revalidate: 300 },
      }
    );
    const data: NomItem[] = await res.json();

    const seen = new Set<string>();
    const results = data
      .map((item) => {
        const a = item.address ?? {};
        const name = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city ?? a.town ?? a.village ?? q;
        const parts = item.display_name.split(",").slice(1, 3).map((s) => s.trim()).filter(Boolean);
        return { name, hint: parts.join(", ") || a.country || "", full: item.display_name };
      })
      .filter((r) => {
        if (seen.has(r.name)) return false;
        seen.add(r.name);
        return true;
      });

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
