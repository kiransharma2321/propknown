import { prisma } from "@/lib/db";
import { geminiJson } from "@/lib/ai/gemini";

// Weekly AI episode planner (Task I): 3 episode ideas with talking points, built from this
// week's price movements in our own data and published (approved) news. Saved as "idea"
// episodes in Podcast Studio for the owner to record in their own voice.

export function episodeSlug(title: string, d = new Date()): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70)}-${d.toISOString().slice(0, 10)}`;
}

export async function planEpisodes() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [movers, news] = await Promise.all([
    prisma.locationMarketCache.findMany({
      where: { previousPrice: { not: null }, fetchedAt: { gte: since }, NOT: { locationKey: { startsWith: "project/" } } },
      orderBy: { fetchedAt: "desc" }, take: 20,
    }),
    prisma.blogPost.findMany({ where: { status: "published", publishedAt: { gte: since } }, orderBy: { publishedAt: "desc" }, take: 10 }).catch(() => []),
  ]);
  const facts = [
    ...movers.map((m) => `PRICE: ${m.locationName} ${m.propertyType}: ${Math.round(m.previousPrice!)} -> ${Math.round(m.pricePerUnit)} ${m.currency}/${m.unit} (AI estimate, captured ${m.fetchedAt.toISOString().slice(0, 10)})`),
    ...news.map((n) => `NEWS (published on propknown.com/news/${n.slug}): ${n.title} — ${n.excerpt}`),
  ];
  if (facts.length === 0) return [];

  const r = await geminiJson<{ episodes: { title: string; topic: string; outline: string }[] }>(`Suggest 3 podcast episodes for "The PropKnown Podcast" (host Pinnelli Raghukiran, home buyers in Hyderabad first, then Bengaluru, Mumbai, Pune, Dubai), based ONLY on these items from this week:
${facts.join("\n")}
For each: a title, a topic, and an outline of 5-7 talking points (one per line, starting with "- "). Quote figures exactly as given and say they are AI estimates; add no other numbers.
Return JSON {"episodes":[{"title","topic","outline"}]}`, { timeoutMs: 40_000, temperature: 0.6 });

  const created = [];
  for (const e of (r.episodes ?? []).slice(0, 3)) {
    if (!e.title?.trim()) continue;
    created.push(await prisma.podcastEpisode.create({
      data: { slug: episodeSlug(e.title), status: "idea", title: e.title.trim().slice(0, 120), topic: e.topic ?? null, outline: e.outline ?? null },
    }));
  }
  return created;
}
