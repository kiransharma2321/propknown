import type { Metadata } from "next";
import Link from "next/link";
import { Mic2, Rss } from "lucide-react";
import { prisma } from "@/lib/db";
import { OG_IMAGE } from "@/app/layout";

// Lists only real, published episodes (recorded MP3 + approved notes from Podcast Studio). The
// earlier hardcoded episode list had no audio behind it, so it was removed.

const BASE_URL = "https://www.propknown.com";
const title = "The PropKnown Podcast";
const description = "Conversations on property prices, RERA and home buying in Hyderabad and beyond, hosted by Pinnelli Raghukiran.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: `${BASE_URL}/podcast`, types: { "application/rss+xml": `${BASE_URL}/podcast/feed.xml` } },
  openGraph: { title, description, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
};
export const revalidate = 1800;

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const mins = (s: number | null) => (s ? `${Math.round(s / 60)} min` : "");

export default async function PodcastPage() {
  const episodes = await prisma.podcastEpisode.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 100 }).catch(() => []);
  return (
    <div className="pt-28 sm:pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-2"><Mic2 size={18} style={{ color: "var(--gold-text)" }} /><p className="text-sm tracking-widest uppercase font-semibold" style={{ color: "var(--gold-text)" }}>Podcast</p></div>
        <h1 className="heading-h1 mb-3">{title}</h1>
        <p className="text-gray-500 mb-4">{description}</p>
        <a href="/podcast/feed.xml" className="inline-flex items-center gap-1.5 text-sm underline text-gray-600 mb-8"><Rss size={14} /> RSS feed</a>
        {episodes.length === 0 ? (
          <p className="text-gray-400">The first episodes are being recorded. Check back soon.</p>
        ) : (
          <div className="space-y-4">
            {episodes.map((e) => (
              <Link key={e.id} href={`/podcast/${e.slug}`} className="block border border-gray-200 rounded-2xl p-5 hover:border-gray-400">
                <p className="text-xs text-gray-400 mb-1">{e.publishedAt ? day(e.publishedAt) : ""}{e.durationSec ? ` · ${mins(e.durationSec)}` : ""}{e.guest ? ` · with ${e.guest}` : ""}</p>
                <h2 className="font-semibold text-gray-900 text-lg">{e.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{e.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
