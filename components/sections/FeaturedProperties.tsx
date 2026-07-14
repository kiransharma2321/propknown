"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PropertyCard from "@/components/ui/PropertyCard";
import { ALL_LISTINGS } from "@/lib/listings";

// Was previously its own hardcoded copy of prop-1..6 (with its own drifted image URLs) --
// consolidated to read from the single ALL_LISTINGS source so fixes there (photos, RERA
// numbers, pricing) don't have to be made twice.
const FEATURED_IDS = ["prop-1", "prop-2", "prop-3", "prop-4", "prop-5", "prop-6"];
const SAMPLE_PROPERTIES = ALL_LISTINGS
  .filter(l => FEATURED_IDS.includes(l.id))
  .map(l => ({
    id: l.id,
    title: `${l.title}, ${l.city}`,
    location: l.location,
    city: l.city,
    price: l.price,
    currency: l.currency,
    beds: l.beds, baths: l.baths, sqft: l.sqft,
    propertyType: l.type.toLowerCase(),
    listingType: l.listingType ?? "sale",
    images: l.images,
    aiScore: l.aiScore,
    reraNumber: l.badge === "RERA" ? l.badgeNo : undefined,
    featured: l.id !== "prop-3" && l.id !== "prop-5", // matches the original curation
    verified: true,
  }));

export default function FeaturedProperties() {
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

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_PROPERTIES.map((p) => (
            <PropertyCard key={p.id} {...p} />
          ))}
        </div>
      </div>
    </section>
  );
}
