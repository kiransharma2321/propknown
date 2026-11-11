import type { Metadata } from "next";
import Link from "next/link";
import { loadGuideAreas, popularSearches, PREFETCH, type GuideArea } from "@/lib/areaGuides";
import AreaSearch from "@/components/area/AreaSearch";
import CountryTabs from "@/components/area/CountryTabs";

export const metadata: Metadata = {
  title: "Area Price Guides: any city, area or project",
  description: "Property price guides for areas in India, the UAE and beyond. Every price shows its sources and the date it was captured.",
  alternates: { canonical: "https://www.propknown.com/area-prices" },
};

export const revalidate = 3600;

// Global Area Price Guides. Lists ONLY areas with a sourced, dated price (from the daily pre-fetch,
// visitors' searches or any other check). Search reaches any place worldwide.
const COUNTRY_ORDER = ["India", "UAE", "United Kingdom", "Singapore", "Canada", "USA"];
const CITY_ORDER = PREFETCH.map((p) => p.city);

export default async function AreaPricesPage() {
  const areas = await loadGuideAreas();
  const popular = await popularSearches(areas);
  const byCountry = new Map<string, Map<string, GuideArea[]>>();
  for (const a of areas) {
    const cities = byCountry.get(a.country) ?? new Map<string, GuideArea[]>();
    cities.set(a.city, [...(cities.get(a.city) ?? []), a]);
    byCountry.set(a.country, cities);
  }
  const rank = (list: string[], v: string) => { const i = list.indexOf(v); return i < 0 ? 999 : i; };
  const countries = Array.from(byCountry.entries())
    .sort((a, b) => rank(COUNTRY_ORDER, a[0]) - rank(COUNTRY_ORDER, b[0]) || a[0].localeCompare(b[0]))
    .map(([country, cities]) => ({
      country,
      cities: Array.from(cities.entries())
        .sort((a, b) => rank(CITY_ORDER, a[0]) - rank(CITY_ORDER, b[0]) || a[0].localeCompare(b[0]))
        .map(([city, list]) => ({ city, areas: list.sort((x, y) => x.area.localeCompare(y.area)) })),
    }));

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
      <h1 className="heading-h1 mb-3">Area Price Guides</h1>
      <p className="text-gray-600 max-w-2xl mb-6">Current asking prices with their sources and capture date, for India, the UAE and beyond. An area appears here once it has a sourced price.</p>
      <div className="max-w-3xl mb-8"><AreaSearch /></div>

      {popular.length > 0 && (
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Popular searches</p>
          <div className="flex flex-wrap gap-2">
            {popular.map((p) => <Link key={p.href} href={p.href} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm hover:border-[#D6A63E]">{p.area}, {p.city}</Link>)}
          </div>
        </div>
      )}

      {countries.length === 0 ? <p className="text-gray-500">No area guides published yet.</p> : <CountryTabs countries={countries} />}
    </section>
  );
}
