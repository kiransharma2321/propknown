import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { OG_IMAGE } from "@/app/layout";
import { GUIDES, findGuide } from "@/lib/guides";

const BASE = "https://www.propknown.com";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = findGuide(params.slug);
  if (!g) return { title: "Guide not found", robots: { index: false } };
  const url = `${BASE}/guides/${g.slug}`;
  return {
    title: g.title, description: g.description,
    alternates: { canonical: url },
    // Unreviewed drafts stay out of search until the author has checked every claim.
    robots: g.reviewed ? undefined : { index: false, follow: true },
    openGraph: { type: "article", title: g.title, description: g.description, url, images: [OG_IMAGE], publishedTime: g.published, modifiedTime: g.updated, authors: [g.author] },
  };
}

const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = findGuide(params.slug);
  if (!g) notFound();
  const url = `${BASE}/guides/${g.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "Article",
      headline: g.title, description: g.description, datePublished: g.published, dateModified: g.updated,
      author: { "@type": "Person", name: g.author }, publisher: { "@type": "Organization", name: "PropKnown", url: BASE },
      mainEntityOfPage: url,
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE}/guides` },
        { "@type": "ListItem", position: 3, name: g.title, item: url },
      ],
    },
  ];

  return (
    <div className="pt-28 sm:pt-32 pb-20 bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-xs text-gray-400 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-gray-700">Home</Link><span>/</span>
          <Link href="/guides" className="hover:text-gray-700">Guides</Link><span>/</span>
          <span className="text-gray-700">{g.title}</span>
        </nav>
        <h1 className="heading-h1 mb-3">{g.title}</h1>
        <p className="text-sm text-gray-500 mb-6">By {g.author} · Published {day(g.published)} · Updated {day(g.updated)}</p>

        {!g.reviewed && (
          <div className="mb-6 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3">
            <p className="font-semibold">Draft — facts under review</p>
            <ul className="list-disc ml-5 mt-1 text-xs">{g.reviewTodo.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        )}

        <p className="text-lg text-gray-700 mb-8">{g.description}</p>
        {g.sections.map((s) => (
          <section key={s.heading} className="mb-8">
            <h2 className="heading-h3 mb-3">{s.heading}</h2>
            {s.paragraphs.map((p) => <p key={p.slice(0, 40)} className="text-gray-700 leading-relaxed mb-3">{p}</p>)}
            {s.bullets && <ul className="list-disc ml-5 space-y-1 text-gray-700">{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
          </section>
        ))}

        <div className="flex flex-wrap gap-3 my-10">
          <Link href={g.tool.href} className="btn-primary">{g.tool.label} <ArrowRight size={16} /></Link>
          <Link href="/price-check" className="btn-secondary">Check if a price is fair</Link>
          <Link href="/true-cost" className="btn-secondary">Work out the true cost</Link>
        </div>

        <div className="border-t border-gray-200 pt-4 text-sm text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Sources</p>
          <ul className="space-y-1">{g.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.label}</a></li>)}</ul>
          <p className="mt-3 text-xs">General information, not legal advice. Verify with RERA and a lawyer before deciding.</p>
        </div>
      </article>
    </div>
  );
}
