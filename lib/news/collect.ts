import { prisma } from "@/lib/db";
import { recordApiCall } from "@/lib/engine/usage";

// Daily collection of real-estate developments (Task H). Approved sources only:
//  - RBI press releases: official RSS feed.
//  - TG RERA public notices/orders: links on the TG RERA homepage (not the captcha-protected search).
//  - PIB, Knight Frank/Anarock/JLL headlines and reputable news: Tavily search restricted to those
//    domains (PIB itself refuses automated requests, so it is never fetched directly).
// Only the headline, link, date and a short snippet are stored; the snippet is used to write an
// original article and is never published.

export interface RawItem { url: string; title: string; sourceName: string; kind: string; publishedAt: Date | null; snippet: string }

const UA = { "User-Agent": "PropKnownBot/1.0 (+https://www.propknown.com)" };
const NEWS_DOMAINS = ["business-standard.com", "economictimes.indiatimes.com", "livemint.com", "thehindubusinessline.com", "thehindu.com"];
const REPORT_DOMAINS = ["knightfrank.co.in", "knightfrank.com", "anarock.com", "jll.co.in", "jll.com"];

const strip = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&#8377;/g, "₹").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function fetchRbi(): Promise<RawItem[]> {
  const res = await fetch("https://www.rbi.org.in/pressreleases_rss.xml", { headers: UA, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`RBI RSS ${res.status}`);
  const xml = await res.text();
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map((m) => {
    const tag = (t: string) => m[1].match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`))?.[1] ?? "";
    const date = new Date(strip(tag("pubDate")));
    return { url: strip(tag("link")), title: strip(tag("title")), sourceName: "Reserve Bank of India", kind: "rbi", publishedAt: isNaN(date.getTime()) ? null : date, snippet: strip(tag("description")).slice(0, 800) };
  }).filter((i) => i.url && i.title);
}

async function fetchReraNotices(): Promise<RawItem[]> {
  const base = "https://rera.telangana.gov.in";
  const res = await fetch(`${base}/`, { headers: UA, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`TG RERA ${res.status}`);
  const html = await res.text();
  return Array.from(html.matchAll(/<a[^>]+href="(\/Home\/ShowPdf\?pdffilename=[^"]+)"[^>]*>([^<]{8,200})<\/a>/g))
    .map((m) => ({ url: `${base}${m[1]}`, title: strip(m[2]), sourceName: "TG RERA", kind: "rera", publishedAt: null, snippet: strip(m[2]) }));
}

interface TavilyHit { title: string; url: string; content: string; published_date?: string }

async function tavily(query: string, domains: string[], kind: string, sourceName?: string): Promise<RawItem[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query, topic: "news", days: 3, max_results: 8, include_domains: domains, search_depth: "basic" }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e) => { recordApiCall("tavily", "error"); throw e; });
  recordApiCall("tavily", res.ok ? "ok" : [429, 432].includes(res.status) ? "rate_limited" : "error");
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = await res.json() as { results?: TavilyHit[] };
  return (data.results ?? []).map((r) => {
    const d = r.published_date ? new Date(r.published_date) : null;
    let host = "";
    try { host = new URL(r.url).hostname.replace(/^www\./, ""); } catch { /* skip */ }
    return { url: r.url, title: strip(r.title), sourceName: sourceName ?? host, kind, publishedAt: d && !isNaN(d.getTime()) ? d : null, snippet: strip(r.content).slice(0, 800) };
  }).filter((i) => i.url && i.title);
}

// Relevance to our markets: Hyderabad first, then Bangalore, Mumbai, Pune, Dubai.
const MARKETS: [string, RegExp, number][] = [
  ["Hyderabad", /hyderabad|telangana|secunderabad|tg rera|ts rera|hmda|kokapet|gachibowli/i, 6],
  ["Bangalore", /bangalore|bengaluru|karnataka/i, 4],
  ["Mumbai", /mumbai|maharashtra|thane|navi mumbai/i, 3],
  ["Pune", /\bpune\b/i, 3],
  ["Dubai", /dubai|uae/i, 2],
];
const TOPIC = /real estate|realty|housing|home loan|repo rate|monetary policy|rera|stamp duty|registration|property|metro|infrastructure|land|apartment|residential|sales|launch/i;

export function scoreItem(i: Pick<RawItem, "title" | "snippet" | "kind">): { relevance: number; markets: string[] } {
  const text = `${i.title} ${i.snippet}`;
  const markets = MARKETS.filter(([, re]) => re.test(text)).map(([m]) => m);
  let relevance = MARKETS.filter(([, re]) => re.test(text)).reduce((a, [, , w]) => a + w, 0);
  if (TOPIC.test(text)) relevance += 3;
  if (i.kind === "rbi" && /repo|monetary policy|policy rate/i.test(text)) relevance += 5;
  if (i.kind === "rera") relevance += 4;
  return { relevance, markets };
}

const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function collectNews() {
  const batches = await Promise.allSettled([
    fetchRbi(),
    fetchReraNotices(),
    tavily("Hyderabad real estate housing news", NEWS_DOMAINS, "news"),
    tavily("India real estate housing sales report Anarock Knight Frank JLL", REPORT_DOMAINS.concat(NEWS_DOMAINS), "report"),
    tavily("housing infrastructure metro announcement Hyderabad Bengaluru Mumbai Pune", ["pib.gov.in"], "pib", "Press Information Bureau"),
  ]);
  const errors = batches.flatMap((b, i) => (b.status === "rejected" ? [`source ${i}: ${String(b.reason).slice(0, 120)}`] : []));
  const items = batches.flatMap((b) => (b.status === "fulfilled" ? b.value : []));

  // De-duplicate within this run and against the last 30 days (by URL and by headline).
  const recent = await prisma.newsItem.findMany({ where: { fetchedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } }, select: { url: true, title: true } });
  const seenUrl = new Set(recent.map((r) => r.url));
  const seenTitle = new Set(recent.map((r) => normTitle(r.title)));
  const fresh: RawItem[] = [];
  for (const i of items) {
    const t = normTitle(i.title);
    if (seenUrl.has(i.url) || seenTitle.has(t)) continue;
    seenUrl.add(i.url); seenTitle.add(t); fresh.push(i);
  }

  const rows = fresh.map((i) => ({ ...i, ...scoreItem(i) })).filter((i) => i.relevance >= 3);
  if (rows.length) await prisma.newsItem.createMany({ data: rows, skipDuplicates: true });
  return { fetched: items.length, added: rows.length, errors };
}
