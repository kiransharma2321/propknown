import type { Metadata } from "next";
import Link from "next/link";
import { OG_IMAGE } from "@/app/layout";
import { GUIDES } from "@/lib/guides";

const title = "Property Buying Guides";
const description = "Plain-English guides for home buyers in Hyderabad and India: RERA checks, true costs and fair prices, each linked to a free PropKnown tool.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "https://www.propknown.com/guides" },
  openGraph: { title, description, images: [OG_IMAGE] },
};

const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function GuidesPage() {
  return (
    <div className="pt-28 sm:pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <p className="text-sm tracking-widest uppercase mb-2 font-semibold" style={{ color: "var(--gold-text)" }}>Guides</p>
        <h1 className="heading-h1 mb-3">Property Buying Guides</h1>
        <p className="text-gray-500 mb-8">{description}</p>
        <div className="space-y-4">
          {GUIDES.map((g) => (
            <Link key={g.slug} href={`/guides/${g.slug}`} className="block border border-gray-200 rounded-2xl p-5 hover:border-gray-400">
              <h2 className="font-semibold text-gray-900 text-lg">{g.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{g.description}</p>
              <p className="text-xs text-gray-400 mt-2">By {g.author} · Updated {day(g.updated)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
