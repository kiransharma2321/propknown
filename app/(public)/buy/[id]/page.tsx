import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findListingById, findNearbyListings, getAddressRegionCountry, truncateAtWord, type Listing } from "@/lib/listings";
import PropertyDetailClient from "@/components/property/PropertyDetailClient";

const BASE_URL = "https://www.propknown.com";

interface Props {
  params: { id: string };
}

// Residence sub-type has a real, specific schema.org match for Apartment/Villa/House; anything
// else (Plot, Farm Land, Commercial) has no accurate dedicated type, so it falls back to the
// generic "Place" rather than forcing a wrong, more specific one.
function residenceType(type: string): string {
  if (type === "Apartment") return "Apartment";
  if (type === "Villa" || type === "House") return "SingleFamilyResidence";
  return "Place";
}

function buildListingJsonLd(listing: Listing) {
  const url = `${BASE_URL}/buy/${listing.id}`;
  const { region, country } = getAddressRegionCountry(listing.city);
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description ?? `${listing.title} in ${listing.location}, ${listing.city}. ${listing.display}.`,
    url,
    image: listing.images,
    datePosted: undefined, // Not tracked per-listing in the current data model -- omitted rather than guessed.
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: listing.currency,
      url,
    },
    about: {
      "@type": residenceType(listing.type),
      name: listing.title,
      address: {
        "@type": "PostalAddress",
        streetAddress: listing.location,
        addressLocality: listing.city,
        ...(region ? { addressRegion: region } : {}),
        ...(country ? { addressCountry: country } : {}),
      },
      ...(listing.lat && listing.lng ? {
        geo: { "@type": "GeoCoordinates", latitude: listing.lat, longitude: listing.lng },
      } : {}),
      ...(listing.sqft ? { floorSize: { "@type": "QuantitativeValue", value: listing.sqft, unitCode: "FTK" } } : {}),
      ...(listing.beds ? { numberOfRooms: listing.beds } : {}),
    },
    // RERA/HMDA registration has no dedicated schema.org property -- PropertyValue under
    // additionalProperty is the standard, honest way to attach a custom identifier without
    // misusing an unrelated field.
    ...(listing.badgeNo ? {
      additionalProperty: {
        "@type": "PropertyValue",
        name: listing.badge === "RERA" ? "RERA Registration Number" : (listing.badge ?? "Registration Number"),
        value: listing.badgeNo,
      },
    } : {}),
  };
}

function buildBreadcrumbJsonLd(listing: Listing) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Buy Properties", item: `${BASE_URL}/buy` },
      { "@type": "ListItem", position: 3, name: listing.title, item: `${BASE_URL}/buy/${listing.id}` },
    ],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = findListingById(params.id);
  if (!listing) return { title: "Property Not Found — PropKnown" };
  const title = `${listing.title} — ${listing.display} | PropKnown`;
  const description = listing.description ? truncateAtWord(listing.description, 155) : `${listing.title} in ${listing.location}, ${listing.city}. ${listing.display}. RERA/HMDA verified. PropKnown.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/buy/${listing.id}` },
    openGraph: { images: listing.images[0] ? [listing.images[0]] : [] },
    twitter: { card: "summary_large_image", title, description, images: listing.images[0] ? [listing.images[0]] : undefined },
  };
}

export default function PropertyDetailPage({ params }: Props) {
  const listing = findListingById(params.id);

  // Was previously an inline friendly UI returned here directly -- looked like an error page
  // but sent HTTP 200 (a "soft 404", flagged explicitly by Google Search Console). notFound()
  // renders the sibling not-found.tsx (identical UI) while correctly sending a real 404 status.
  if (!listing) {
    notFound();
  }

  const nearbyListings = findNearbyListings(listing);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildListingJsonLd(listing)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(listing)) }}
      />
      <PropertyDetailClient listing={listing} nearbyListings={nearbyListings} />
    </>
  );
}

// Pre-generate pages for all known listing IDs at build time
export function generateStaticParams() {
  return [
    "prop-1","prop-2","prop-3","prop-4","prop-5","prop-6",
    "aparna","bhooja","prestige","hmda-plot","vasavi",
    "farmland","kompally","rajapushpa",
  ].map(id => ({ id }));
}
