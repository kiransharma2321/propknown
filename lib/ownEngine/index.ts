import { computeMarketIntelFromHits, ownEngineQuery } from "@/lib/marketIntel";
import { aiText, configuredProviders } from "@/lib/ai/router";
import { webSearch, configuredSearch, type Hit } from "@/lib/search";
import { fetchPage } from "@/lib/search/fetcher";

// PropKnown Own Engine (no paid AI bills): own search layer -> own page fetcher (robots.txt
// respected) -> free-tier AI reads ONLY that text -> the live engine's own parsing, regex grounding
// and normalisation. NOT used by the site until the owner approves a switch (ENGINE_MODE=own),
// and only if the accuracy comparison is within 5% of the current engine.

export const OWN_ENGINE_TTL_DAYS = { area: 14, project: 7 } as const;
const PORTAL_DOMAINS: [RegExp, string[]][] = [
  [/dubai|abu dhabi|sharjah|uae/i, ["bayut.com", "propertyfinder.ae", "dxboffplan.com", "driven.ae"]],
  [/london|united kingdom|\buk\b/i, ["rightmove.co.uk", "zoopla.co.uk", "onthemarket.com"]],
  [/singapore/i, ["99.co", "propertyguru.com.sg", "edgeprop.sg", "srx.com.sg"]],
  [/toronto|canada/i, ["zolo.ca", "condos.ca", "realtor.ca"]],
  [/./, ["magicbricks.com", "99acres.com", "housing.com", "squareyards.com", "proptiger.com", "makaan.com", "nobroker.in"]],
];

export const engineMode =() => (process.env.ENGINE_MODE === "own" ? "own" : "current");

// The page's own sentences that mention the area and a price: page text is used to extract
// figures only (never republished). The live engine reads at most ~900 chars per result.
function priceSentences(text: string, area: string): string {
  const a = area.toLowerCase();
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter((s) => /(?:₹|rs\.?|aed|£|s\$|ca\$|\$)\s?[\d,]+|per\s+sq|\/\s?sq/i.test(s));
  const onArea = sentences.filter((s) => s.toLowerCase().includes(a));
  return (onArea.length ? onArea : sentences).join(" ").slice(0, 900);
}

export async function ownMarketPrice(location: string, propertyType: string, unit: string, stats: Record<string, number> = {}): Promise<Record<string, unknown>> {
  // Portal names inside the query make search engines return the portals' company profiles
  // (seen with Tavily); restrict to the portals' domains instead, then widen if that finds little.
  const query = (await ownEngineQuery(location, propertyType, unit)).replace(/\s+(magicbricks|99acres|squareyards|housing\.com|proptiger|bayut|propertyfinder|rightmove|zoopla|propertyguru|realtor|realestate)\b.*$/i, "");
  const domains = PORTAL_DOMAINS.find(([re]) => re.test(location))?.[1];
  let hits: Hit[] = await webSearch(query, { maxResults: 6, priceSourcesOnly: true, domains });
  stats.searches = (stats.searches ?? 0) + 1;
  if (hits.length < 3) {
    const more = await webSearch(query, { maxResults: 8, priceSourcesOnly: true });
    stats.searches++;
    hits = Array.from(new Map([...hits, ...more].map((h) => [h.url, h])).values()).slice(0, 6);
  }
  const area = location.split(",")[0].trim();
  // Enrich the top results with price sentences from the page itself (robots.txt permitting).
  const enriched = await Promise.all(hits.map(async (h, i) => {
    if (i >= 3) return h;
    try {
      const page = await fetchPage(h.url, { timeoutMs: 8_000 });
      stats.pagesFetched = (stats.pagesFetched ?? 0) + 1;
      const extra = priceSentences(page.text, area);
      return extra ? { ...h, content: `${extra} ${h.content}`.slice(0, 1800) } : h;
    } catch { stats.fetchSkipped = (stats.fetchSkipped ?? 0) + 1; return h; }
  }));
  return computeMarketIntelFromHits(location, propertyType, unit, enriched, async (prompt) => {
    const r = await aiText(prompt, { temperature: 0.25, maxTokens: 2048, timeoutMs: 30_000 });
    stats[`ai_${r.provider}`] = (stats[`ai_${r.provider}`] ?? 0) + 1;
    return r.text;
  });
}

export function ownEngineStatus() {
  return { mode: engineMode(), ai: configuredProviders(), search: configuredSearch(), ttl: OWN_ENGINE_TTL_DAYS };
}
