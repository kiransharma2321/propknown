import { prisma } from "@/lib/db";
import { findAreaPage, getAreaPrices, areaPagesWithData, areaPath } from "@/lib/areaPages";
import { checkProject } from "@/lib/projects";
import { GUIDES } from "@/lib/guides";
import { ALL_LOCALITIES } from "@/lib/localities";
import { sourceHosts } from "@/lib/engine/sources";
import type { BoardRow } from "./PriceBoard";
import type { HeroExampleData } from "./HeroCheck";

// Everything the homepage shows, from real data only. Sections whose data doesn't exist yet
// (verified projects, news, reviewed guides, podcast episodes) come back empty and are hidden.

const BOARD = ["kokapet", "gachibowli", "kondapur", "financial-district", "hitec-city", "medchal", "narsingi", "tellapur"];

export async function loadHome() {
  const boardRows: BoardRow[] = await Promise.all(BOARD.map(async (slug) => {
    const page = findAreaPage("hyderabad", slug);
    if (!page) return { area: slug, href: "/ai-intelligence", price: null, capturedAt: null, confidence: null };
    const apt = (await getAreaPrices(page).catch(() => [])).find((p) => p.type === "apartment");
    return { area: page.area, href: areaPath(page), price: apt?.price ?? null, capturedAt: apt?.capturedAt ?? null, confidence: apt?.confidence?.level ?? null };
  }));

  const [project, pagesWithData, cachedPrices, verifiedProjects, news, episodes] = await Promise.all([
    checkProject({ name: "Prestige High Fields", area: "Financial District, Hyderabad", propertyType: "apartment" }).catch(() => null),
    areaPagesWithData().catch(() => []),
    // Published area prices only: rows with at least one real source (same rule as the engine).
    prisma.locationMarketCache.findMany({ where: { NOT: { locationKey: { startsWith: "project/" } } }, select: { data: true } })
      .then((rows) => rows.filter((r) => sourceHosts((r.data as { sourceUrls?: unknown } | null)?.sourceUrls).length > 0).length)
      .catch(() => 0),
    prisma.property.findMany({ where: { status: "approved", verified: true }, orderBy: { createdAt: "desc" }, take: 3 }).catch(() => []),
    prisma.blogPost.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 3 }).catch(() => []),
    prisma.podcastEpisode.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 1 }).catch(() => []),
  ]);

  const fd = boardRows.find((r) => r.href.endsWith("/financial-district"));
  const firstPriced = boardRows.find((r) => r.price);
  const example: HeroExampleData = {
    area: firstPriced?.price ? { name: firstPriced.area, price: firstPriced.price, capturedAt: firstPriced.capturedAt, confidence: firstPriced.confidence } : null,
    project: project?.found && project.price ? {
      name: project.name, area: project.query.area, min: project.price.min, max: project.price.max, median: project.price.median,
      sources: project.price.sources.length, capturedAt: project.price.capturedAt,
      verdict: project.verdict?.label ?? null, pct: project.verdict?.pctVsLocality ?? null, confidence: project.confidence?.level ?? null,
    } : null,
  };

  return {
    boardRows, example,
    threeWay: { aiArea: fd ?? null, project: example.project },
    counts: { hyderabadLocalities: ALL_LOCALITIES.filter((l) => l.citySlug === "hyderabad").length, areasWithData: pagesWithData.length, cachedPrices },
    verifiedProjects, news, guides: GUIDES.filter((g) => g.reviewed).slice(0, 3), episode: episodes[0] ?? null,
  };
}
