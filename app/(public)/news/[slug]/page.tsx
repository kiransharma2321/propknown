import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OG_IMAGE } from "@/app/layout";
import type { Citation } from "@/lib/news/draft";

export const revalidate = 1800;
const BASE = "https://www.propknown.com";

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({ where: { slug, status: "published" } }).catch(() => null);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getPost(params.slug);
  if (!p) return { title: "Article not found", robots: { index: false } };
  const url = `${BASE}/news/${p.slug}`;
  return {
    title: p.title, description: p.excerpt, alternates: { canonical: url },
    openGraph: { type: "article", title: p.title, description: p.excerpt, url, images: [OG_IMAGE], publishedTime: p.publishedAt?.toISOString(), modifiedTime: p.updatedAt.toISOString() },
  };
}

const day = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function NewsArticle({ params }: { params: { slug: string } }) {
  const p = await getPost(params.slug);
  if (!p) notFound();
  const citations = (p.citations ?? []) as unknown as Citation[];
  const related = (p.relatedLinks ?? []) as unknown as { label: string; href: string }[];
  const url = `${BASE}/news/${p.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.excerpt,
      datePublished: p.publishedAt?.toISOString(), dateModified: p.updatedAt.toISOString(),
      author: { "@type": "Organization", name: "PropKnown" }, publisher: { "@type": "Organization", name: "PropKnown", url: BASE }, mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "News", item: `${BASE}/news` },
        { "@type": "ListItem", position: 3, name: p.title, item: url },
      ],
    },
  ];
  return (
    <div className="pt-28 sm:pt-32 pb-20 bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-xs text-gray-400 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-gray-700">Home</Link><span>/</span>
          <Link href="/news" className="hover:text-gray-700">News</Link>
        </nav>
        <p className="text-xs text-gray-400 mb-2">{p.kind === "market_pulse" ? "Market Pulse" : "News"} · {p.publishedAt ? day(p.publishedAt) : ""}</p>
        <h1 className="heading-h1 mb-4">{p.title}</h1>
        {p.body.split(/\n\s*\n/).map((para, i) => <p key={i} className="text-gray-700 leading-relaxed mb-4">{para}</p>)}
        {citations.filter((c) => c.quote).map((c) => (
          <blockquote key={c.url} className="border-l-4 pl-4 my-4 text-gray-600 italic" style={{ borderColor: "var(--gold)" }}>
            &ldquo;{c.quote}&rdquo; <span className="not-italic text-sm">— {c.source}</span>
          </blockquote>
        ))}
        {p.whatItMeans && (
          <section className="bg-gray-50 border border-gray-200 rounded-2xl p-5 my-8">
            <h2 className="heading-h3 mb-2">What this means for buyers</h2>
            <p className="text-gray-700 leading-relaxed">{p.whatItMeans}</p>
          </section>
        )}
        {related.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {related.map((r) => <Link key={r.href} href={r.href} className="text-sm border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-400">{r.label}</Link>)}
          </div>
        )}
        <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Sources</p>
          <ul className="space-y-1">
            {citations.map((c) => <li key={c.url}><a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">{c.title}</a> — {c.source}{c.date ? `, ${day(c.date)}` : ""}</li>)}
          </ul>
          <p className="mt-3 text-xs">Written by PropKnown from the sources above. General information, not investment or legal advice.</p>
        </div>
      </article>
    </div>
  );
}
