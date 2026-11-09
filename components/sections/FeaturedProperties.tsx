import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FeaturedPropertiesGrid from "./FeaturedPropertiesGrid";
import { PUBLIC_LISTINGS } from "@/lib/listings";

// No "use client" here -- the header/CTA are static and render on the server as before. The
// actual 6 property cards moved to FeaturedPropertiesGrid, a client component that fetches them
// from /api/featured-properties after initial paint instead of either shipping the full 22KB
// ALL_LISTINGS dataset to the browser (the old client-component version) or baking all 6 cards'
// full markup into the static homepage HTML (the server-component version that replaced it --
// that added ~30KB to the initial document and measurably hurt FCP/LCP). This keeps both wins.
export default function FeaturedProperties() {
  // The cards are the sample listings; with them hidden there is nothing honest to feature.
  if (PUBLIC_LISTINGS.length === 0) return null;
  return (
    <section className="py-20 bg-brand-black">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-[#7A5C1A] text-sm font-semibold tracking-widest uppercase mb-2">Curated Selection</p>
            <h2 className="heading-h2">
              Verified Properties, <span className="gold-text">Zero Guesswork</span>
            </h2>
            <p className="text-zinc-400 mt-3 max-w-md">
              Hand-picked, RERA-verified properties with AI-scored investment potential.
            </p>
          </div>
          <Link href="/buy" className="btn-secondary whitespace-nowrap self-start md:self-auto">
            Explore Verified Listings <ArrowRight size={16} />
          </Link>
        </div>

        <FeaturedPropertiesGrid />
      </div>
    </section>
  );
}
