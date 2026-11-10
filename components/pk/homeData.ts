import { prisma } from "@/lib/db";
import { allAreaPages, areaPath } from "@/lib/areaPages";
import { getMarketPrice, unitLabel } from "@/lib/engine";
import { checkProject } from "@/lib/projects";
import { sourceSiteCount } from "@/lib/projects/sites";
import { GUIDES } from "@/lib/guides";
import { sourceHosts } from "@/lib/engine/sources";
import type { CityBoard, BoardRow } from "./CityPriceBoard";
import type { HeroExampleData } from "./HeroCheck";

// Everything the homepage shows, from real data only. Sections whose data doesn't exist yet
// (verified projects, news, reviewed guides, podcast episodes) come back empty and are hidden.

// Price board cities, in this order. `names` are the spellings a cached location may use.
const BOARD_CITIES = [
  { slug: "hyderabad", label: "Hyderabad", names: ["hyderabad"], symbol: "₹" },
  { slug: "bangalore", label: "Bengaluru", names: ["bangalore", "bengaluru"], symbol: "₹" },
  { slug: "mumbai", label: "Mumbai", names: ["mumbai"], symbol: "₹" },
  { slug: "pune", label: "Pune", names: ["pune"], symbol: "₹" },
  { slug: "chennai", label: "Chennai", names: ["chennai"], symbol: "₹" },
  { slug: "dubai", label: "Dubai", names: ["dubai"], symbol: "AED " },
];
const MAX_BARS = 8;

// One board per city: every area with a sourced apartment price (no source -> not shown), read
// through the same cache-only engine path the area pages use, so numbers match those pages.
async function loadBoards(): Promise<CityBoard[]> {
  const rows = await prisma.locationMarketCache.findMany({
    where: { propertyType: "apartment", pricePerUnit: { gt: 0 }, NOT: { locationKey: { startsWith: "project/" } } },
    select: { locationKey: true, locationName: true, data: true },
  }).catch(() => []);
  const pages = allAreaPages();

  const found = await Promise.all(rows
    .filter((r) => sourceHosts((r.data as { sourceUrls?: unknown } | null)?.sourceUrls).length > 0)
    .map(async (r) => {
      const page = pages.find((pg) => r.locationKey === `${pg.citySlug}/${pg.areaSlug}` || r.locationName.toLowerCase() === `${pg.area}, ${pg.city}`.toLowerCase());
      const [areaPart, cityPart] = r.locationName.split(",").map((s) => s.trim());
      const city = BOARD_CITIES.find((c) => c.slug === page?.citySlug || (cityPart && c.names.includes(cityPart.toLowerCase())));
      // Skip city-level rows ("Hyderabad, India") and rows we can't place in a city.
      if (!city || !areaPart || city.names.includes(areaPart.toLowerCase())) return null;
      const m = await getMarketPrice({ location: r.locationName, propertyType: "apartment", tool: "seo_page", cacheOnly: true, skipLog: true }).catch(() => null);
      if (!m?.available || !(Number(m.currentPricePerSqft) > 0) || !sourceHosts(m.sourceUrls).length) return null;
      const row: BoardRow = {
        area: page?.area ?? areaPart,
        href: page ? areaPath(page) : `/ai-intelligence?area=${encodeURIComponent(areaPart)}&city=${encodeURIComponent(city.label)}`,
        price: Number(m.currentPricePerSqft),
        capturedAt: m.fetchedAt ? String(m.fetchedAt) : null,
        confidence: (m.confidence as { level?: string } | undefined)?.level ?? null,
      };
      return { city: city.slug, unit: unitLabel(String(m.pricePerSqftUnit ?? "sqft")), row };
    }));

  return BOARD_CITIES.map((c) => {
    const mine = found.filter((f): f is NonNullable<typeof f> => !!f && f.city === c.slug);
    const unique = Array.from(new Map(mine.map((f) => [f.row.area.toLowerCase(), f])).values())
      .sort((a, b) => (b.row.capturedAt ?? "").localeCompare(a.row.capturedAt ?? ""))
      .slice(0, MAX_BARS);
    return {
      slug: c.slug, label: c.label, symbol: c.symbol, unit: unique[0]?.unit ?? "sq.ft",
      rows: unique.map((f) => f.row),
      checkHref: `/ai-intelligence?city=${encodeURIComponent(c.label)}`,
    };
  });
}

export async function loadHome() {
  const [boards, project, verifiedProjects, news, episodes] = await Promise.all([
    loadBoards(),
    checkProject({ name: "Prestige High Fields", area: "Financial District, Hyderabad", propertyType: "apartment", cacheOnly: true }).catch(() => null),
    prisma.property.findMany({ where: { status: "approved", verified: true }, orderBy: { createdAt: "desc" }, take: 3 }).catch(() => []),
    prisma.blogPost.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 3 }).catch(() => []),
    prisma.podcastEpisode.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 1 }).catch(() => []),
  ]);

  const hyd = boards.find((b) => b.slug === "hyderabad")?.rows ?? [];
  const fd = hyd.find((r) => r.href.endsWith("/financial-district"));
  const firstPriced = hyd[0];
  const example: HeroExampleData = {
    area: firstPriced ? { name: firstPriced.area, price: firstPriced.price, capturedAt: firstPriced.capturedAt, confidence: firstPriced.confidence } : null,
    project: project?.found && project.price ? {
      name: project.name, area: project.query.area, min: project.price.min, max: project.price.max, median: project.price.median,
      sources: sourceSiteCount(project.price), capturedAt: project.price.capturedAt,
      verdict: project.verdict?.label ?? null, pct: project.verdict?.pctVsLocality ?? null, confidence: project.confidence?.level ?? null,
    } : null,
  };

  return {
    boards, example,
    threeWay: { aiArea: fd ?? null, project: example.project },
    verifiedProjects, news, guides: GUIDES.filter((g) => g.reviewed).slice(0, 3), episode: episodes[0] ?? null,
  };
}
