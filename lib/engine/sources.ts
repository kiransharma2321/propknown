// Hosts that show up in search results but are never a price source: the search provider itself,
// company-database/social sites, and Google's grounding redirect host. Filtered out of every
// source list the engine stores or shows (and so out of the confidence source count).
const NON_SOURCE_HOSTS = /(^|\.)(tavily\.com|tracxn\.com|crunchbase\.com|linkedin\.com|rocketreach\.co|leadiq\.com|zoominfo\.com|instagram\.com|facebook\.com|youtube\.com|x\.com|twitter\.com|reddit\.com|quora\.com|pinterest\.com|vertexaisearch\.cloud\.google\.com)$/;

export function isPriceSource(url: string): boolean {
  try {
    return !NON_SOURCE_HOSTS.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
