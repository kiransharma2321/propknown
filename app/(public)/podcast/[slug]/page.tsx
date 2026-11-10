import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OG_IMAGE } from "@/app/layout";

export const revalidate = 1800;
const BASE = "https://www.propknown.com";

async function getEpisode(slug: string) {
  return prisma.podcastEpisode.findFirst({ where: { slug, status: "published" } }).catch(() => null);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const e = await getEpisode(params.slug);
  if (!e) return { title: "Episode not found", robots: { index: false } };
  const url = `${BASE}/podcast/${e.slug}`;
  return { title: e.title, description: e.description, alternates: { canonical: url }, openGraph: { type: "article", title: e.title, description: e.description, url, images: [OG_IMAGE] } };
}

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const isoDuration = (s: number) => `PT${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}H` : ""}${Math.floor((s % 3600) / 60)}M${s % 60}S`;

export default async function EpisodePage({ params }: { params: { slug: string } }) {
  const e = await getEpisode(params.slug);
  if (!e) notFound();
  const chapters = (e.chapters ?? []) as { start: string; title: string }[];
  const related = (e.relatedLinks ?? []) as { label: string; href: string }[];
  const url = `${BASE}/podcast/${e.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "PodcastEpisode", name: e.title, description: e.description, url,
      datePublished: e.publishedAt?.toISOString(),
      ...(e.durationSec ? { timeRequired: isoDuration(e.durationSec) } : {}),
      associatedMedia: { "@type": "MediaObject", contentUrl: e.audioUrl, encodingFormat: "audio/mpeg" },
      partOfSeries: { "@type": "PodcastSeries", name: "The PropKnown Podcast", url: `${BASE}/podcast`, webFeed: `${BASE}/podcast/feed.xml` },
      ...(e.guest ? { actor: { "@type": "Person", name: e.guest } } : {}),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Podcast", item: `${BASE}/podcast` },
        { "@type": "ListItem", position: 3, name: e.title, item: url },
      ],
    },
  ];
  return (
    <div className="pt-28 sm:pt-32 pb-20 bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-xs text-gray-400 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-gray-700">Home</Link><span>/</span><Link href="/podcast" className="hover:text-gray-700">Podcast</Link>
        </nav>
        <p className="text-xs text-gray-400 mb-2">{e.publishedAt ? day(e.publishedAt) : ""}{e.topic ? ` · ${e.topic}` : ""}{e.guest ? ` · with ${e.guest}` : ""}</p>
        <h1 className="heading-h1 mb-4">{e.title}</h1>
        {e.audioUrl && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio controls preload="none" src={e.audioUrl} className="w-full mb-6" />
        )}
        {e.showNotes && e.showNotes.split(/\n\s*\n/).map((p, i) => <p key={i} className="text-gray-700 leading-relaxed mb-4">{p}</p>)}
        {chapters.length > 0 && (
          <section className="my-6">
            <h2 className="heading-h3 mb-2">Chapters</h2>
            <ol className="space-y-1 text-sm text-gray-700">{chapters.map((c) => <li key={`${c.start}${c.title}`}><span className="tabular-nums text-gray-400 mr-2">{c.start}</span>{c.title}</li>)}</ol>
          </section>
        )}
        {related.length > 0 && (
          <div className="flex flex-wrap gap-2 my-6">
            {related.map((r) => <Link key={r.href} href={r.href} className="text-sm border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-400">{r.label}</Link>)}
          </div>
        )}
        <div className="flex flex-wrap gap-2 my-6">
          <Link href="/price-check" className="btn-secondary text-sm">Check if a price is fair</Link>
          <Link href="/legal-shield" className="btn-secondary text-sm">RERA &amp; fraud check</Link>
          <Link href="/ai-intelligence" className="btn-secondary text-sm">Area prices</Link>
        </div>
        {e.transcript && (
          <details className="border border-gray-200 rounded-xl p-4 mt-6">
            <summary className="cursor-pointer font-semibold text-gray-900">Transcript</summary>
            <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{e.transcript}</p>
          </details>
        )}
      </article>
    </div>
  );
}
