import { NextResponse } from "next/server";
import { PUBLIC_LISTINGS } from "@/lib/listings";
import type { PropertyCardProps } from "@/components/ui/PropertyCard";

// Same 6 IDs / same mapping FeaturedProperties.tsx used to do inline -- moved here so the full
// ALL_LISTINGS dataset (22KB) stays server-only. The homepage fetches just this pre-filtered
// ~2KB response client-side after initial paint, instead of either shipping the whole dataset
// to the browser or baking all 6 cards' markup into the static HTML.
const FEATURED_IDS = ["prop-1", "prop-2", "prop-3", "prop-4", "prop-5", "prop-6"];

// force-static + a long revalidate -- this data only changes on redeploy (ALL_LISTINGS is a
// hardcoded source file, not a database table), so there's nothing to compute fresh per request.
export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const properties: PropertyCardProps[] = PUBLIC_LISTINGS
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

  return NextResponse.json({ properties });
}
