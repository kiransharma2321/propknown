import type { Metadata } from "next";
import Link from "next/link";
import { allAreaPages, areaPagesWithData } from "@/lib/areaPages";

export const metadata: Metadata = {
  title: "Area Price Guides",
  description: "Area-by-area property price guides: every price shows its sources and the date it was captured.",
  alternates: { canonical: "https://www.propknown.com/area-prices" },
};

export const revalidate = 21600;

// Index of the area price pages (/ai-intelligence/[city]/[area]). Only areas with at least one
// sourced, dated price are listed -- same rule as the sitemap.
export default async function AreaPricesPage() {
  const withData = await areaPagesWithData().catch(() => []);
  const paths = new Set(withData.map((p) => p.path));
  const pages = allAreaPages().filter((p) => paths.has(`/ai-intelligence/${p.citySlug}/${p.areaSlug}`));
  const byCity = new Map<string, typeof pages>();
  for (const p of pages) byCity.set(p.city, [...(byCity.get(p.city) ?? []), p]);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-20">
      <h1 className="heading-h1 mb-3">Area Price Guides</h1>
      <p className="text-gray-600 max-w-2xl mb-10">Each guide shows current asking prices with their sources and capture date. We only list an area once it has a sourced price.</p>
      {pages.length === 0 && <p className="text-gray-500">No area guides published yet.</p>}
      {Array.from(byCity.entries()).sort((a, b) => b[1].length - a[1].length).map(([city, list]) => (
        <div key={city} className="mb-10">
          <h2 className="heading-h3 mb-4"><span className="gold-text">{city}</span> <span className="text-sm text-gray-400 font-normal">· {list.length} areas</span></h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {list.sort((a, b) => a.area.localeCompare(b.area)).map((p) => (
              <li key={p.areaSlug}><Link href={`/ai-intelligence/${p.citySlug}/${p.areaSlug}`} className="block rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-[#D6A63E] hover:text-[#7A5C1A]">{p.area}</Link></li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
