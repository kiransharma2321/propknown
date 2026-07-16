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
  const q    = (searchParams.get("q") ?? "").trim();
  // Optional city/country scope for the two-level search's Area field -- appending it to the
  // query both biases Nominatim's free-text geocoder toward that city and (combined with the
  // post-filter below) keeps a locality name that exists in multiple cities (e.g. a "Marina")
  // from leaking in from the wrong one.
  const city = (searchParams.get("city") ?? "").trim();

  if (q.length < 2) return NextResponse.json([]);

  const searchQuery = city ? `${q}, ${city}` : q;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=12&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "PropKnown/1.0 (raghupinnelli@gmail.com)",
        },
        next: { revalidate: 300 },
      }
    );
    const data: NomItem[] = await res.json();
    const cityLower = city.toLowerCase();

    const seen = new Set<string>();
    const results = data
      .filter((item) => {
        // When scoped to a city, require the result to actually belong to it -- Nominatim's
        // free-text bias isn't a hard filter on its own, so without this a query for an area
        // name that also exists elsewhere can still surface the wrong city's match.
        if (!city) return true;
        const a = item.address ?? {};
        const haystack = [a.city, a.town, a.village, a.county, a.state, item.display_name]
          .filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(cityLower);
      })
      .map((item) => {
        const a = item.address ?? {};
        // Pick the most specific name available
        const name =
          a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ??
          a.city ?? a.town ?? a.village ?? q;

        // Build a meaningful hint: city + state/country
        const cityPart = a.city ?? a.town ?? a.county ?? "";
        const state    = a.state ?? "";
        const country  = a.country ?? "";
        const hintParts: string[] = [];
        if (cityPart && cityPart !== name) hintParts.push(cityPart);
        if (state && state !== cityPart)   hintParts.push(state);
        if (country)                        hintParts.push(country);
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
