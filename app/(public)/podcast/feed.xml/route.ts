import { prisma } from "@/lib/db";

// Podcast RSS 2.0 feed with the iTunes/Podcasting 2.0 tags Spotify, Apple Podcasts and YouTube
// Music read. Published episodes only.
export const revalidate = 1800;

const BASE = "https://www.propknown.com";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hms = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");

export async function GET() {
  const [show, episodes] = await Promise.all([
    prisma.podcastShow.findUnique({ where: { id: "show" } }).catch(() => null),
    prisma.podcastEpisode.findMany({ where: { status: "published", audioUrl: { not: null } }, orderBy: { publishedAt: "desc" }, take: 300 }).catch(() => []),
  ]);
  const title = show?.title ?? "The PropKnown Podcast";
  const description = show?.description || "Conversations on property prices, RERA and home buying in Hyderabad and beyond.";
  const owner = show?.ownerName ?? "Pinnelli Raghukiran";

  const items = episodes.map((e) => `
    <item>
      <title>${esc(e.title)}</title>
      <link>${BASE}/podcast/${e.slug}</link>
      <guid isPermaLink="false">${e.id}</guid>
      <pubDate>${(e.publishedAt ?? e.createdAt).toUTCString()}</pubDate>
      <description>${esc(e.showNotes || e.description)}</description>
      <itunes:summary>${esc(e.description)}</itunes:summary>
      <enclosure url="${esc(e.audioUrl!)}" length="${e.audioBytes ?? 0}" type="audio/mpeg" />
      ${e.durationSec ? `<itunes:duration>${hms(e.durationSec)}</itunes:duration>` : ""}
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
    </item>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${esc(title)}</title>
    <link>${BASE}/podcast</link>
    <atom:link href="${BASE}/podcast/feed.xml" rel="self" type="application/rss+xml" />
    <language>${esc(show?.language ?? "en-in")}</language>
    <description>${esc(description)}</description>
    <itunes:summary>${esc(description)}</itunes:summary>
    <itunes:author>${esc(owner)}</itunes:author>
    <itunes:owner><itunes:name>${esc(owner)}</itunes:name>${show?.ownerEmail ? `<itunes:email>${esc(show.ownerEmail)}</itunes:email>` : ""}</itunes:owner>
    ${show?.coverUrl ? `<itunes:image href="${esc(show.coverUrl)}" /><image><url>${esc(show.coverUrl)}</url><title>${esc(title)}</title><link>${BASE}/podcast</link></image>` : ""}
    <itunes:category text="${esc(show?.category ?? "Business")}" />
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
