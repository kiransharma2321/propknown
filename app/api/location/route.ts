import { NextRequest, NextResponse } from "next/server";

interface NomItem {
  display_name: string;
  type?: string;
  addresstype?: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return NextResponse.json([]);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=12&addressdetails=1`,
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
        // Pick the most specific name available
        const name =
          a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ??
          a.city ?? a.town ?? a.village ?? q;

        // Build a meaningful hint: city + state/country
        const city    = a.city ?? a.town ?? a.county ?? "";
        const state   = a.state ?? "";
        const country = a.country ?? "";
        const hintParts: string[] = [];
        if (city && city !== name)    hintParts.push(city);
        if (state && state !== city)  hintParts.push(state);
        if (country)                   hintParts.push(country);
        const hint = hintParts.slice(0, 2).join(", ");

        return { name, hint, full: item.display_name };
      })
      .filter((r) => {
        // Dedup by name+hint so same-named areas in different cities both show
        const key = `${r.name}|${r.hint}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);

    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
