import { getMarketPrice } from "@/lib/engine";
import { sourceHosts } from "@/lib/engine/sources";
import { findCachedProject } from "@/lib/projects";
import { investmentScore, type ScoreInputs, type ScoreResult } from "@/lib/investmentScore";

// M4: gather Investment Score inputs from the cache only (never a paid lookup) and score them.
export async function scoreFor(location: string, propertyType: string, projectName?: string | null): Promise<ScoreResult & { inputs: ScoreInputs }> {
  const m = await getMarketPrice({ location, propertyType, tool: "seo_page", cacheOnly: true, skipLog: true }).catch(() => null);
  const areaOk = !!m?.available && Number(m.currentPricePerSqft) > 0 && sourceHosts(m.sourceUrls).length > 0;
  const inputs: ScoreInputs = {
    areaPrice: areaOk ? Number(m!.currentPricePerSqft) : null,
    areaRangeMin: areaOk ? Number(m!.priceRangeMin) || null : null,
    history5yr: areaOk && Array.isArray(m!.priceHistory5yr) ? (m!.priceHistory5yr as { year: number; value: number }[]) : null,
    rentalYieldPct: areaOk && Number(m!.rentalYield) > 0 ? Number(m!.rentalYield) : null,
    confidence: areaOk ? ((m!.confidence as { level?: string } | undefined)?.level ?? null) : null,
    rera: null,
  };
  if (projectName) {
    const p = await findCachedProject(projectName, location, propertyType);
    if (p?.found) {
      inputs.price = p.price && p.price.sources.length ? p.price.median : null;
      inputs.confidence = p.confidence?.level ?? inputs.confidence;
      inputs.rera = p.facts.reraNumber ? "stated" : "none";
      if (!inputs.areaPrice && p.locality) { inputs.areaPrice = p.locality.price; inputs.areaRangeMin = p.locality.rangeMin; }
    }
  }
  return { ...investmentScore(inputs), inputs };
}
