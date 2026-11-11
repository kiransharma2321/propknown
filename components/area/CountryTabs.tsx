"use client";

import { useState } from "react";
import Link from "next/link";
import type { GuideArea } from "@/lib/areaGuides";

// /area-prices: country tabs -> city groups -> areas (each with the date its price was updated).
const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function CountryTabs({ countries }: { countries: { country: string; cities: { city: string; areas: GuideArea[] }[] }[] }) {
  const [active, setActive] = useState(countries[0]?.country ?? "");
  const c = countries.find((x) => x.country === active) ?? countries[0];
  if (!c) return null;
  return (
    <div>
      <div role="tablist" aria-label="Country" className="flex flex-wrap gap-2 mb-6">
        {countries.map((x) => (
          <button key={x.country} type="button" role="tab" aria-selected={x.country === c.country} onClick={() => setActive(x.country)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border ${x.country === c.country ? "bg-[#0B1B33] text-white border-[#0B1B33]" : "border-gray-300 text-gray-700 hover:border-[#D6A63E]"}`}>
            {x.country}
          </button>
        ))}
      </div>
      {c.cities.map((city) => (
        <div key={city.city} className="mb-8">
          <h2 className="heading-h3 mb-3"><span className="gold-text">{city.city}</span></h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {city.areas.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="block rounded-lg border border-gray-200 px-3 py-2 hover:border-[#D6A63E]">
                  <span className="text-sm font-semibold text-gray-900">{a.area}</span>
                  <span className="block text-[11px] text-gray-500">Updated {day(a.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
