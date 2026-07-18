import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { HOT_MARKETS, PROPERTY_TYPES, slugify, findHotMarketBySlug } from "@/lib/hotMarkets";
import PropertyTypeSummaryCard, { type PropertyTypeSummaryData } from "@/components/ai-intel/PropertyTypeSummaryCard";
import { OG_IMAGE } from "@/app/layout";

const BASE_URL = "https://www.propknown.com";

// Static params for exactly the 10 hot-market combos -- these pages are pre-known at build time,
// pre-computed by app/api/cron/refresh-hot-markets, and read directly from HotMarketCache here
// with zero live Gemini/Tavily calls, so Google can crawl the full 6-property-type breakdown for
// each without any JS execution or gate involved.
export function generateStaticParams() {
  return HOT_MARKETS.map((m) => ({ city: slugify(m.city), area: slugify(m.area) }));
}

interface Props { params: { city: string; area: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const market = findHotMarketBySlug(params.city, params.area);
  if (!market) return { title: "Location Not Found — PropKnown" };
  const { city, area } = market;
  const title = `${area}, ${city} Property Prices — All Types`;
  const description = `AI-verified property prices in ${area}, ${city} across apartments, villas, plots & more — each in the correct local unit, with sources and honest disclaimers. Updated every few hours.`;
  const url = `${BASE_URL}/ai-intelligence/${params.city}/${params.area}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

// Refreshed by the cron job every ~6 hours; this is a CDN-cache safety net on top of that so a
// stale edge cache entry doesn't outlive the underlying DB row by too much.
export const revalidate = 3600;

export default async function HotMarketOverviewPage({ params }: Props) {
  const market = findHotMarketBySlug(params.city, params.area);
  if (!market) notFound();
  const { city, area } = market;

  const rows = await prisma.hotMarketCache.findMany({ where: { city, area } });
  const byType = new Map(rows.map((r) => [r.propertyType, r.data as unknown as PropertyTypeSummaryData]));

  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>
            AI Market Overview
          </p>
          <h1 className="heading-h1 mb-4">
            {area}, {city} <span className="gold-text">Property Prices</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Every property type in one place — AI-verified prices, each in the correct local unit,
            with real sources and honest disclaimers. Refreshed every few hours.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {PROPERTY_TYPES.map((pt) => (
            <PropertyTypeSummaryCard
              key={pt.value}
              propertyTypeLabel={pt.label}
              data={byType.get(pt.value) ?? { available: false }}
            />
          ))}
        </div>

        <div className="text-center bg-gray-50 border border-gray-200 rounded-2xl p-8">
          <h2 className="heading-h3 mb-2">Want a different location or exact size?</h2>
          <p className="text-gray-500 text-sm mb-5 max-w-xl mx-auto">
            Use the full AI Intelligence tool for any location worldwide, with 5-year trends,
            rental yield, EMI calculator, and more.
          </p>
          <Link href={`/ai-intelligence?area=${encodeURIComponent(area)}&city=${encodeURIComponent(city)}`} className="btn-primary inline-flex">
            Open Full AI Intelligence Tool <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
