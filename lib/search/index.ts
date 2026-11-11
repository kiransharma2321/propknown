import { recordApiCall } from "@/lib/engine/usage";
import { isPriceSource } from "@/lib/engine/sources";

// PropKnown Own Engine: search layer. Order: SearXNG (self-hosted, free) -> Tavily (free credits)
// -> Brave (free plan) -> Serper (free credits). A provider without config is skipped; the next
// one is tried on an error or an empty result. Returns plain hits; callers fetch pages themselves.
// Env: SEARXNG_URL (e.g. https://search.example.com), TAVILY_API_KEY, BRAVE_API_KEY, SERPER_API_KEY.

export interface Hit { title: string; url: string; content: string; provider: string }
type Opts = { maxResults?: number; domains?: string[]; timeoutMs?: number; priceSourcesOnly?: boolean };

const siteFilter = (domains?: string[]) => (domains?.length ? ` (${domains.map((d) => `site:${d}`).join(" OR ")})` : "");

async function searxng(q: string, o: Opts): Promise<Hit[] | null> {
  const base = process.env.SEARXNG_URL?.replace(/\/$/, "");
  if (!base) return null;
  const res = await fetch(`${base}/search?format=json&q=${encodeURIComponent(q + siteFilter(o.domains))}`, {
    headers: { "User-Agent": "PropKnownBot/1.0 (+https://www.propknown.com)" }, signal: AbortSignal.timeout(o.timeoutMs ?? 10_000),
  });
  recordApiCall("searxng", res.ok ? "ok" : "error");
  if (!res.ok) return [];
  const j = (await res.json()) as { results?: { title: string; url: string; content?: string }[] };
  return (j.results ?? []).map((r) => ({ title: r.title, url: r.url, content: r.content ?? "", provider: "searxng" }));
}

async function tavily(q: string, o: Opts): Promise<Hit[] | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query: q, max_results: o.maxResults ?? 6, search_depth: "basic", ...(o.domains ? { include_domains: o.domains } : {}) }),
    signal: AbortSignal.timeout(o.timeoutMs ?? 12_000),
  });
  recordApiCall("tavily", res.ok ? "ok" : [429, 432].includes(res.status) ? "rate_limited" : "error");
  if (!res.ok) return [];
  const j = (await res.json()) as { results?: { title: string; url: string; content: string }[] };
  return (j.results ?? []).map((r) => ({ ...r, provider: "tavily" }));
}

async function brave(q: string, o: Opts): Promise<Hit[] | null> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?count=${o.maxResults ?? 6}&q=${encodeURIComponent(q + siteFilter(o.domains))}`, {
    headers: { Accept: "application/json", "X-Subscription-Token": key }, signal: AbortSignal.timeout(o.timeoutMs ?? 10_000),
  });
  recordApiCall("brave", res.ok ? "ok" : res.status === 429 ? "rate_limited" : "error");
  if (!res.ok) return [];
  const j = (await res.json()) as { web?: { results?: { title: string; url: string; description?: string; extra_snippets?: string[] }[] } };
  return (j.web?.results ?? []).map((r) => ({ title: r.title, url: r.url, content: [r.description, ...(r.extra_snippets ?? [])].filter(Boolean).join(" ").replace(/<[^>]+>/g, ""), provider: "brave" }));
}

async function serper(q: string, o: Opts): Promise<Hit[] | null> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST", headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q: q + siteFilter(o.domains), num: o.maxResults ?? 6 }), signal: AbortSignal.timeout(o.timeoutMs ?? 10_000),
  });
  recordApiCall("serper", res.ok ? "ok" : res.status === 429 ? "rate_limited" : "error");
  if (!res.ok) return [];
  const j = (await res.json()) as { organic?: { title: string; link: string; snippet?: string }[] };
  return (j.organic ?? []).map((r) => ({ title: r.title, url: r.link, content: r.snippet ?? "", provider: "serper" }));
}

const CHAIN: [string, (q: string, o: Opts) => Promise<Hit[] | null>, () => string | undefined][] = [
  ["searxng", searxng, () => process.env.SEARXNG_URL],
  ["tavily", tavily, () => process.env.TAVILY_API_KEY],
  ["brave", brave, () => process.env.BRAVE_API_KEY],
  ["serper", serper, () => process.env.SERPER_API_KEY],
];

export async function webSearch(query: string, o: Opts = {}): Promise<Hit[]> {
  for (const [, fn] of CHAIN) {
    const hits = await fn(query, o).catch(() => [] as Hit[]);
    if (hits === null) continue; // not configured
    const ok = hits.filter((h) => /^https?:\/\//.test(h.url) && (!o.priceSourcesOnly || isPriceSource(h.url))).slice(0, o.maxResults ?? 6);
    if (ok.length) return ok;
  }
  return [];
}

export const configuredSearch = () => CHAIN.filter(([, , cfg]) => !!cfg()).map(([id]) => id);
