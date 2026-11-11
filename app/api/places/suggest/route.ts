import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { allAreaPages, areaPath } from "@/lib/areaPages";
import { loadGuideAreas, sameCity } from "@/lib/areaGuides";

// Search-as-you-type for /area-prices: places from Photon (komoot's public OpenStreetMap search,
// built for autocomplete -- Nominatim's policy forbids autocomplete) + projects we have checked.
// GET /api/places/suggest?q=jurong
const UA = "PropKnown/1.0 (raghupinnelli@gmail.com)";
const COUNTRY: Record<string, string> = { "united arab emirates": "UAE", "united states": "USA", "united states of america": "USA" };
const normCountry = (c: string) => COUNTRY[c.toLowerCase()] ?? c;
const FOCUS = ["India", "UAE", "United Kingdom", "Singapore", "Canada", "USA"];
const PLACE_KINDS = new Set(["suburb", "neighbourhood", "quarter", "city", "town", "village", "borough", "locality", "district", "hamlet"]);

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 3) return NextResponse.json({ places: [], projects: [] });

  const [photon, projectRows, guide] = await Promise.all([
    fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=en`, { headers: { "User-Agent": UA }, next: { revalidate: 86_400 }, signal: AbortSignal.timeout(6_000) })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ features?: { properties: Record<string, string> }[] } | null>,
    prisma.locationMarketCache.findMany({ where: { locationKey: { startsWith: "project/" }, locationName: { contains: q.split(" ")[0], mode: "insensitive" } }, select: { locationName: true, data: true }, take: 5 }).catch(() => []),
    loadGuideAreas().catch(() => []),
  ]);

  const pages = allAreaPages();
  const seen = new Set<string>();
  const places = (photon?.features ?? []).map((f) => f.properties).filter((p) => p.name && PLACE_KINDS.has(p.osm_value ?? p.type ?? "")).map((p) => {
    const city = p.city || p.county || p.state || (p.countrycode === "SG" ? "Singapore" : "");
    const area = p.name;
    const page = pages.find((pg) => pg.area.toLowerCase() === area.toLowerCase() && sameCity(pg.city, city));
    // Already priced -> open it, no new check. Match the city under any spelling (Bangalore /
    // Bengaluru), or -- when OpenStreetMap files the area under a village or "Greater London" --
    // the only priced area of that name in the same country.
    const country = normCountry(p.country ?? "");
    const sameName = guide.filter((g) => g.area.toLowerCase() === area.toLowerCase());
    const inCountry = sameName.filter((g) => g.country === country);
    const cached = sameName.find((g) => sameCity(g.city, city)) ?? (inCountry.length === 1 ? inCountry[0] : undefined);
    const shownCity = cached?.city ?? (city === area ? "" : city);
    return { area, city: shownCity, country, label: [area, shownCity, p.country].filter(Boolean).join(" · "), href: page ? areaPath(page) : cached?.href ?? null };
  }).filter((p) => { const k = p.label.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    // Priced places first, then our main markets, then everywhere else.
    .sort((a, b) => Number(!!b.href) - Number(!!a.href) || (FOCUS.indexOf(a.country) + 1 || 99) - (FOCUS.indexOf(b.country) + 1 || 99))
    .slice(0, 6);

  const projects = projectRows
    .map((r) => r.data as { found?: boolean; name?: string; query?: { area?: string } } | null)
    .filter((d): d is { found: true; name: string; query: { area?: string } } => !!d?.found && !!d.name)
    .map((d) => ({ name: d.name, area: d.query.area ?? "" }));

  return NextResponse.json({ places, projects }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
}
