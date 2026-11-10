import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Scale, ShieldCheck } from "lucide-react";
import { OG_IMAGE } from "@/app/layout";
import { allAreaPages, findAreaPage, getAreaPrices, nearbyPages, areaPath, type TypePrice } from "@/lib/areaPages";
import { ConfidenceBadge, AI_DISCLAIMER } from "@/components/ai-intel/PriceTrust";
import WatchButton from "@/components/buyer/WatchButton";
import AreaGeo from "@/components/area/AreaGeo";
import VerifiedInfra from "@/components/area/VerifiedInfra";
import { FEATURES } from "@/lib/features";
import FairPriceReportButton from "@/components/leads/FairPriceReportButton";

// Canonical area price page. Server-rendered from the cache tables only (lib/areaPages) -- no
// live AI call during render. Pages with no cached price render an honest "not yet available"
// state with noindex, and are left out of the sitemap.

const BASE_URL = "https://www.propknown.com";
export const revalidate = 3600;

interface Props { params: { city: string; area: string } }

export function generateStaticParams() {
  return allAreaPages().map((p) => ({ city: p.citySlug, area: p.areaSlug }));
}

const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const money = (t: TypePrice, v: number) => `${t.symbol}${v.toLocaleString("en-IN")}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findAreaPage(params.city, params.area);
  if (!page) return { title: "Location Not Found — PropKnown", robots: { index: false } };
  const prices = (await getAreaPrices(page)).filter((p) => p.price);
  const title = `${page.area}, ${page.city} Property Prices`;
  const first = prices[0];
  const description = first
    ? `${page.area}, ${page.city}: ${first.label.toLowerCase()} about ${money(first, first.price!)}/${first.unit} (captured ${day(first.capturedAt!)}), with the range, confidence level and real sources for each property type.`
    : `Property prices for ${page.area}, ${page.city} are not available yet on PropKnown.`;
  const url = `${BASE_URL}${areaPath(page)}`;
  return {
    title, description,
    alternates: { canonical: url },
    robots: prices.length ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

export default async function AreaPricePage({ params }: Props) {
  const page = findAreaPage(params.city, params.area);
  if (!page) notFound();
  const all = await getAreaPrices(page);
  const priced = all.filter((p) => p.price);
  const nearby = nearbyPages(page);
  const url = `${BASE_URL}${areaPath(page)}`;
  const main = priced[0] ?? null;

  // FAQs only from what this page actually shows.
  const faqs: { q: string; a: string }[] = [];
  for (const t of priced.slice(0, 3)) {
    faqs.push({
      q: `What is the ${t.label.toLowerCase()} price in ${page.area}, ${page.city}?`,
      a: `About ${money(t, t.price!)} per ${t.unit}${t.rangeMin && t.rangeMax ? `, in a range of ${money(t, t.rangeMin)}–${money(t, t.rangeMax)}` : ""}, as captured on ${day(t.capturedAt!)}. ${t.confidence ? `${t.confidence.level} confidence: ${t.confidence.reason}` : ""} This is an AI estimate, not a valuation.`,
    });
  }
  if (priced.length) {
    faqs.push({
      q: "How does PropKnown work out these prices?",
      a: "An AI model reads current listing and price pages for this specific area, extracts the typical rate, and cross-checks it against price figures quoted for the area. City-wide averages are not used as a local price. Each figure shows the date it was captured and its sources.",
    });
  }

  const jsonLd = [
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "AI Intelligence", item: `${BASE_URL}/ai-intelligence` },
        { "@type": "ListItem", position: 3, name: `${page.area}, ${page.city}`, item: url },
      ],
    },
    ...(faqs.length ? [{
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    }] : []),
  ];

  return (
    <div className="pt-28 sm:pt-32 pb-20 bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-xs text-gray-400 mb-6 flex flex-wrap gap-1">
          <Link href="/" className="hover:text-gray-700">Home</Link><span>/</span>
          <Link href="/ai-intelligence" className="hover:text-gray-700">AI Intelligence</Link><span>/</span>
          <span className="text-gray-700">{page.area}, {page.city}</span>
        </nav>

        <div className="mb-8">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Area price guide</p>
          <h1 className="heading-h1 mb-3">{page.area}, {page.city} Property Prices</h1>
          <p className="text-gray-500 max-w-2xl">
            {priced.length
              ? <>Typical prices for each property type in {page.area}, each with its captured date, confidence level and real sources.</>
              : <>We don&apos;t have verified price data for {page.area} yet, and we don&apos;t publish guesses. You can run a live check below.</>}
          </p>
          <p className="text-gray-500 text-xs mt-2">{AI_DISCLAIMER}</p>
          <WatchButton kind="area" location={`${page.area}, ${page.city}`} className="mt-3" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {all.map((t) => (
            <section key={t.type} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col">
              <h2 className="text-gray-900 font-semibold mb-2">{t.label}</h2>
              {t.price ? (
                <>
                  <p className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                    {money(t, t.price)}<span className="text-sm text-gray-400 font-normal">/{t.unit}</span>
                  </p>
                  {t.rangeMin && t.rangeMax && <p className="text-sm text-gray-500 mt-1">Range {money(t, t.rangeMin)} – {money(t, t.rangeMax)}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">Captured {day(t.capturedAt!)}</p>
                  <div className="mt-3"><ConfidenceBadge confidence={t.confidence} /></div>
                  <p className="text-[11px] text-gray-500 mt-3">
                    {t.sources.length
                      ? <>Sources: {t.sources.slice(0, 5).map((s, i) => <span key={s.url}>{i > 0 && ", "}<a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">{s.host}</a></span>)}</>
                      : "Sources unavailable"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Not yet available. We only show prices with real, dated sources.</p>
              )}
            </section>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-12">
          <Link href="/price-check" className="card-dark p-5 rounded-2xl hover:border-gray-400">
            <Scale size={18} style={{ color: "var(--gold-text)" }} />
            <p className="font-semibold text-gray-900 mt-2">Is your price fair?</p>
            <p className="text-sm text-gray-500">Compare an asking price with {page.area}&apos;s range.</p>
          </Link>
          <Link href="/legal-shield" className="card-dark p-5 rounded-2xl hover:border-gray-400">
            <ShieldCheck size={18} style={{ color: "var(--gold-text)" }} />
            <p className="font-semibold text-gray-900 mt-2">Check RERA &amp; fraud risk</p>
            <p className="text-sm text-gray-500">Free check before you pay a token.</p>
          </Link>
          <div className="card-dark p-5 rounded-2xl">
            <p className="font-semibold text-gray-900 mb-2">Free Fair-Price Report (PDF)</p>
            {main
              ? <FairPriceReportButton location={`${page.area}, ${page.city}`} propertyType={main.type} />
              : <p className="text-sm text-gray-500">Available once we have price data for this area.</p>}
          </div>
        </div>

        {faqs.length > 0 && (
          <div className="mb-12">
            <h2 className="heading-h3 mb-4">Questions about {page.area} prices</h2>
            <div className="space-y-3">
              {faqs.map((f) => (
                <div key={f.q} className="border border-gray-200 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.q}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {nearby.length > 0 && (
          <div className="mb-12">
            <h2 className="heading-h3 mb-4">Nearby areas</h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((n) => (
                <Link key={n.areaSlug} href={areaPath(n)} className="inline-flex items-center gap-1 text-sm border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-400">
                  <MapPin size={12} /> {n.area}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* M7 (flag): verified infrastructure (admin-entered, sourced) + OpenStreetMap map/nearby */}
        {FEATURES.maps && (
          <div className="mb-12">
            <VerifiedInfra citySlug={page.citySlug} areaSlug={page.areaSlug} />
            <AreaGeo area={page.area} city={page.city} />
          </div>
        )}

        <div className="text-center bg-gray-50 border border-gray-200 rounded-2xl p-6 sm:p-8">
          <h2 className="heading-h3 mb-2">Need an exact size or another location?</h2>
          <p className="text-gray-500 text-sm mb-5 max-w-xl mx-auto">The full AI Intelligence tool gives a live check with the 5-year trend, EMI and true cost.</p>
          <Link href={`/ai-intelligence?area=${encodeURIComponent(page.area)}&city=${encodeURIComponent(page.city)}`} className="btn-primary inline-flex">
            Open AI Intelligence <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
