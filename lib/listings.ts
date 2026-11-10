import type { LegalChecklist } from "./legalShield";
import type { ConstructionMilestone } from "./constructionProgress";

export interface Listing {
  id: string;
  title: string;
  location: string;
  city: string;
  display: string;
  price: number;
  currency: string;
  sqft?: number;
  /** Carpet area, sqft -- distinct from `sqft` (built-up area). Left unset rather than
   *  estimated: RERA-disclosed carpet area is a specific verified figure, not something to
   *  guess from a loading-factor formula. */
  carpetSqft?: number;
  beds?: number;
  baths?: number;
  floor?: string;
  facing?: string;
  status: string;
  /** "sale" or "rent" -- inferred from existing pricing (e.g. a "/mo" display), not new data. */
  listingType?: string;
  badge?: string;
  badgeNo?: string;
  aiScore?: number;
  type: string;
  images: string[];
  description?: string;
  extra?: string;
  lat?: number;
  lng?: number;
  features?: string[];
  legalChecklist?: LegalChecklist;
  legalChecklistNotes?: string;
  constructionMilestones?: ConstructionMilestone[];
  constructionPctComplete?: number;
  constructionExpectedCompletion?: string;
}

// Pre-defined coordinates for known areas (avoids geocoding for all static listings)
const AREA_COORDS: Record<string, [number, number]> = {
  "Gachibowli":        [17.4449, 78.3498],
  "Kokapet":           [17.3900, 78.3200],
  "Nallagandla":       [17.4612, 78.3072],
  "HITEC City":        [17.4474, 78.3762],
  "Banjara Hills":     [17.4138, 78.4449],
  "Financial District":[17.4143, 78.3445],
  "Whitefield":        [12.9698, 77.7500],
  "Dubai Marina":      [25.0777, 55.1403],
  "Medchal":           [17.6281, 78.4842],
  "Shankarpally":      [17.4218, 78.1271],
  "Kollur":            [17.4742, 78.2485],
  "Nizampet":          [17.5095, 78.3768],
  "Kompally":          [17.5697, 78.4718],
  "Tellapur":          [17.4832, 78.2805],
  "Manikonda":         [17.4010, 78.3938],
  "Kondapur":          [17.4610, 78.3611],
};

export function getListingCoords(location: string, city: string): [number, number] | null {
  for (const [area, coords] of Object.entries(AREA_COORDS)) {
    if (location.toLowerCase().includes(area.toLowerCase()) ||
        area.toLowerCase().includes(location.toLowerCase())) {
      return coords;
    }
  }
  const cityFallbacks: Record<string, [number, number]> = {
    "Hyderabad":   [17.3850, 78.4867],
    "Bangalore":   [12.9716, 77.5946],
    "Dubai":       [25.2048, 55.2708],
    "Mumbai":      [19.0760, 72.8777],
    "Rangareddy":  [17.4218, 78.1271],
  };
  return cityFallbacks[city] ?? null;
}

// For structured-data addresses (JSON-LD PostalAddress). Found and fixed a real bug while
// auditing: the RealEstateListing schema previously hardcoded addressRegion:"Telangana" and
// addressCountry:"IN" for every listing regardless of city -- silently wrong for the site's
// own Dubai Marina listing (city: "Dubai") and Whitefield listing (city: "Bangalore", which is
// Karnataka, not Telangana). Returns undefined region/country for any city not in this map
// rather than guessing, since a wrong claimed location is worse than an absent one.
const CITY_REGION_COUNTRY: Record<string, { region?: string; country: string }> = {
  "Hyderabad":  { region: "Telangana",    country: "IN" },
  "Rangareddy": { region: "Telangana",    country: "IN" },
  "Bangalore":  { region: "Karnataka",    country: "IN" },
  "Mumbai":     { region: "Maharashtra",  country: "IN" },
  "Pune":       { region: "Maharashtra",  country: "IN" },
  "Chennai":    { region: "Tamil Nadu",   country: "IN" },
  "Delhi NCR":  { region: "Delhi",        country: "IN" },
  "Dubai":      { country: "AE" },
  "Singapore":  { country: "SG" },
  "London":     { country: "GB" },
  "Toronto":    { region: "Ontario",      country: "CA" },
};

export function getAddressRegionCountry(city: string): { region?: string; country?: string } {
  return CITY_REGION_COUNTRY[city] ?? {};
}

// Plain .slice(0, n) on a meta description cuts mid-word ("...excellent cross-ventil") --
// found while auditing the two dynamic listing pages that use this pattern. Backs up to the
// last space within the limit instead, so it always ends on a whole word.
export function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

// Sample listings: hand-written demo data with illustrative RERA numbers and AI scores. They are
// NOT real verified properties, so they stay hidden from every public surface (/buy, homepage,
// detail pages, sitemap) unless NEXT_PUBLIC_SHOW_SAMPLE_LISTINGS=true. Off by default.
export const SHOW_SAMPLE_LISTINGS = process.env.NEXT_PUBLIC_SHOW_SAMPLE_LISTINGS === "true";

// The 14 hardcoded sample listings (stock photos, made-up RERA/DLD numbers and AI scores) were
// removed on the owner's instruction (Task C). Real listings come from the database only.
export const ALL_LISTINGS: Listing[] = [];

/** What public pages may show: the sample listings only when the flag is on. */
export const PUBLIC_LISTINGS: Listing[] = SHOW_SAMPLE_LISTINGS ? ALL_LISTINGS : [];

export function findListingById(id: string): Listing | null {
  return PUBLIC_LISTINGS.find(l => l.id === id) ?? null;
}

const NEARBY_RADIUS_KM = 5; // "nearby" means genuinely nearby — 1-5km, not just same city

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Genuinely nearby (1-5km, by real coordinates), closest first. Falls back to same-city
// (previous behaviour) only when the listing has no coordinates to measure distance from.
export function findNearbyListings(listing: Listing, max = 4): Listing[] {
  if (listing.lat == null || listing.lng == null) {
    return PUBLIC_LISTINGS.filter(l => l.id !== listing.id && l.city === listing.city).slice(0, max);
  }
  return PUBLIC_LISTINGS
    .filter(l => l.id !== listing.id && l.lat != null && l.lng != null)
    .map(l => ({ listing: l, dist: haversineKm(listing.lat!, listing.lng!, l.lat!, l.lng!) }))
    .filter(({ dist }) => dist <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, max)
    .map(({ listing: l }) => l);
}
