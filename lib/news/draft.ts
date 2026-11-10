import type { NewsItem, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { geminiJson } from "@/lib/ai/gemini";
import { ALL_LOCALITIES, localityPath } from "@/lib/localities";
import { unitLabel } from "@/lib/engine";

// Blog Studio drafts. The AI writes ORIGINAL text in PropKnown's voice from the collected
// headline + snippet: never copied, at most one short quote (under 15 words) per source, always
// attributed. Every source is listed with its link and date. Drafts only -- the admin publishes.

export interface Citation { title: string; url: string; source: string; date: string | null; quote?: string }
interface Drafted { title: string; excerpt: string; body: string; whatItMeans: string; quote?: string | null }

const MARKET_CITY: Record<string, string> = { Hyderabad: "hyderabad", Bangalore: "bangalore", Mumbai: "mumbai", Pune: "pune", Dubai: "dubai" };

export function slugFor(title: string, d = new Date()): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  return `${base}-${d.toISOString().slice(0, 10)}`;
}

function relatedFor(markets: string[]) {
  const links: { label: string; href: string }[] = [];
  for (const m of markets.slice(0, 2)) {
    const city = MARKET_CITY[m];
    const locs = ALL_LOCALITIES.filter((l) => l.citySlug === city).slice(0, 3);
    for (const l of locs) links.push({ label: `${l.name} prices`, href: localityPath(l) });
  }
  links.push({ label: "Check if a price is fair", href: "/price-check" }, { label: "True cost calculator", href: "/true-cost" });
  return links;
}

// A quote is kept only if it is under 15 words and actually appears in the source snippet.
function safeQuote(q: string | null | undefined, snippet: string | null): string | undefined {
  if (!q) return undefined;
  const words = q.trim().split(/\s+/).length;
  return words < 15 && snippet?.includes(q.trim()) ? q.trim() : undefined;
}

export async function draftFromItem(item: NewsItem, existingId?: string) {
  const prompt = `You write for PropKnown, a home-buyer advisory in India (Hyderabad first). Write an ORIGINAL short article about this development, in our own words.
RULES:
- Use ONLY the facts in the source below. Do not add numbers, names, dates or claims that are not in it.
- Never copy sentences. You may include at most ONE direct quote of fewer than 15 words, copied exactly from the source text, in "quote" (or null).
- Body: 2-3 short paragraphs, plain English, neutral; mention the source by name ("${item.sourceName} said...").
- "whatItMeans": 2-3 sentences on what this means for home buyers, practical and careful; no investment advice, no predictions stated as fact.
- If the source has too little information for an article, return {"title":""}.
Return JSON: {"title","excerpt" (1 sentence),"body","whatItMeans","quote"}.

SOURCE (${item.sourceName}, ${item.publishedAt ? item.publishedAt.toDateString() : "date not given"}): ${item.title}
${item.snippet ?? ""}`;
  const d = await geminiJson<Drafted>(prompt, { timeoutMs: 40_000, temperature: 0.4 });
  if (!d.title?.trim() || !d.body?.trim()) return null;

  const citations: Citation[] = [{
    title: item.title, url: item.url, source: item.sourceName,
    date: item.publishedAt ? item.publishedAt.toISOString().slice(0, 10) : item.fetchedAt.toISOString().slice(0, 10),
    quote: safeQuote(d.quote, item.snippet),
  }];
  const data = {
    kind: "news", title: d.title.trim().slice(0, 140), excerpt: (d.excerpt ?? "").trim().slice(0, 280),
    body: d.body.trim(), whatItMeans: (d.whatItMeans ?? "").trim(),
    citations: citations as unknown as Prisma.InputJsonValue, relatedLinks: relatedFor(item.markets) as unknown as Prisma.InputJsonValue,
  };
  const post = existingId
    ? await prisma.blogPost.update({ where: { id: existingId }, data })
    : await prisma.blogPost.create({ data: { ...data, slug: slugFor(d.title) } });
  await prisma.newsItem.update({ where: { id: item.id }, data: { postId: post.id } });
  return post;
}

// Weekly "Market Pulse": built from PropKnown's own cache -- areas whose cached price moved since
// the previous capture. The AI only narrates these numbers.
export async function draftMarketPulse(existingId?: string) {
  const rows = await prisma.locationMarketCache.findMany({
    where: { previousPrice: { not: null }, fetchedAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
    orderBy: { fetchedAt: "desc" }, take: 40,
  });
  const movers = rows
    .map((r) => ({ name: r.locationName, type: r.propertyType, unit: unitLabel(r.unit), currency: r.currency, now: r.pricePerUnit, was: r.previousPrice!, at: r.fetchedAt, prevAt: r.previousAt, key: r.locationKey }))
    .map((m) => ({ ...m, pct: Math.round(((m.now - m.was) / m.was) * 1000) / 10 }))
    .filter((m) => Math.abs(m.pct) >= 1)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 8);
  if (movers.length === 0) return null;

  const facts = movers.map((m) => `${m.name} (${m.type}): ${m.currency} ${Math.round(m.was).toLocaleString("en-IN")} -> ${Math.round(m.now).toLocaleString("en-IN")}/${m.unit} (${m.pct > 0 ? "+" : ""}${m.pct}%), captured ${m.prevAt?.toISOString().slice(0, 10) ?? "earlier"} and ${m.at.toISOString().slice(0, 10)}`).join("\n");
  const d = await geminiJson<Drafted>(`Write PropKnown's weekly "Market Pulse" for home buyers from ONLY these price movements in our own AI price data (each is an AI estimate from live web sources, not transaction data):
${facts}
RULES: quote the figures exactly; add no other numbers; say clearly these are AI estimates that can move with the sources; no investment advice.
Return JSON: {"title","excerpt" (1 sentence),"body" (3 short paragraphs),"whatItMeans" (2-3 sentences),"quote": null}`, { timeoutMs: 40_000, temperature: 0.4 });
  if (!d.title?.trim()) return null;

  const citations: Citation[] = movers.map((m) => {
    const loc = ALL_LOCALITIES.find((l) => `${l.citySlug}/${l.slug}` === m.key);
    return { title: `${m.name} ${m.type} price`, url: loc ? `https://www.propknown.com${localityPath(loc)}` : "https://www.propknown.com/ai-intelligence", source: "PropKnown price data", date: m.at.toISOString().slice(0, 10) };
  });
  const data = {
    kind: "market_pulse", title: d.title.trim().slice(0, 140), excerpt: (d.excerpt ?? "").trim().slice(0, 280),
    body: d.body.trim(), whatItMeans: (d.whatItMeans ?? "").trim(),
    citations: citations as unknown as Prisma.InputJsonValue,
    relatedLinks: [{ label: "All area prices", href: "/ai-intelligence" }, { label: "Check if a price is fair", href: "/price-check" }] as unknown as Prisma.InputJsonValue,
  };
  return existingId
    ? prisma.blogPost.update({ where: { id: existingId }, data })
    : prisma.blogPost.create({ data: { ...data, slug: slugFor(`market-pulse ${d.title}`) } });
}

// Social captions for Content Studio, drafted on publish (drafts only; the admin posts them).
export async function socialCaptions(post: { title: string; excerpt: string; slug: string }) {
  const url = `https://www.propknown.com/news/${post.slug}`;
  const r = await geminiJson<{ instagram: string; linkedin: string }>(`Write two short social captions for this PropKnown article. Use only what the title and summary say; no new facts or numbers.
Title: ${post.title}
Summary: ${post.excerpt}
Return JSON {"instagram" (max 60 words, 3 hashtags), "linkedin" (max 80 words)}. End both with: ${url}`, { timeoutMs: 30_000 }).catch(() => null);
  return r;
}
