// Hosts that show up in search results but are never a price source: the search provider itself,
// company-database/social sites, and Google's grounding redirect host. Filtered out of every
// source list the engine stores or shows (and so out of the confidence source count).
const NON_SOURCE_HOSTS = /(^|\.)(tavily\.com|tracxn\.com|crunchbase\.com|linkedin\.com|rocketreach\.co|leadiq\.com|zoominfo\.com|instagram\.com|facebook\.com|youtube\.com|x\.com|twitter\.com|reddit\.com|quora\.com|pinterest\.com|vertexaisearch\.cloud\.google\.com)$/;

/** The display host of a real price source ("magicbricks.com"), or null for a non-source. */
export function sourceHost(url: string): string | null {
  if (!isPriceSource(url)) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

/** Distinct real price-source hosts from a list of URLs (non-sources dropped). */
export function sourceHosts(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return Array.from(new Set(urls.map((u) => sourceHost(String(u))).filter((h): h is string => !!h)));
}

export function isPriceSource(url: string): boolean {
  try {
    return !NON_SOURCE_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
