// Single source of truth for the "hot market" locations and property-type list, shared by:
// - app/(public)/ai-intelligence/page.tsx (Popular Markets chips + property type dropdown)
// - app/api/cron/refresh-hot-markets/route.ts (what to precompute)
// - app/(public)/ai-intelligence/[city]/[area]/page.tsx (generateStaticParams + display)
// - app/api/market-intel/overview/route.ts (cache-hit lookup)
// Previously a local const only inside ai-intelligence/page.tsx -- moved here so every one of
// these has exactly one list to stay in sync with, not several copies that can drift apart.

export interface HotMarket { city: string; area: string; }

// Split into city + area so a chip click (or a static-page lookup) fills/matches both levels of
// the two-field search correctly, instead of dumping a combined string into one field.
export const HOT_MARKETS: HotMarket[] = [
  { city: "Hyderabad", area: "Kokapet" },
  { city: "Hyderabad", area: "Gachibowli" },
  { city: "Hyderabad", area: "Financial District" },
  { city: "Hyderabad", area: "Medchal" },
  { city: "Bangalore", area: "Whitefield" },
  { city: "Bangalore", area: "Sarjapur Road" },
  { city: "Dubai",     area: "Dubai Marina" },
  { city: "Dubai",     area: "Business Bay" },
  { city: "Mumbai",    area: "Bandra West" },
  { city: "Pune",      area: "Hinjewadi" },
];

export interface PropertyTypeOption { value: string; label: string; defaultUnit: string; }

export const PROPERTY_TYPES: PropertyTypeOption[] = [
  { value: "apartment",   label: "Apartment",               defaultUnit: "sqft"   },
  { value: "villa",       label: "Villa",                   defaultUnit: "sqft"   },
  { value: "house",       label: "Independent House",       defaultUnit: "sqft"   },
  { value: "commercial",  label: "Commercial / Office",     defaultUnit: "sqft"   },
  { value: "plot",        label: "Plot / Residential Land", defaultUnit: "sqyard" },
  { value: "agriculture", label: "Agriculture / Farm Land", defaultUnit: "acres"  },
];

// URL-safe slug for the /ai-intelligence/[city]/[area] dynamic route segments.
export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "-");
}

// Reverse lookup: since HOT_MARKETS is a small fixed list, match against it directly rather than
// guessing a title-case transform back from the slug (avoids "dubai-marina" incorrectly becoming
// "Dubai marina" or similar casing mismatches against what Tavily/Gemini/the cache key expect).
export function findHotMarketBySlug(citySlug: string, areaSlug: string): HotMarket | null {
  return HOT_MARKETS.find((m) => slugify(m.city) === citySlug && slugify(m.area) === areaSlug) ?? null;
}

// Case-insensitive match against free-typed city/area text (e.g. from the homepage hero or the
// ai-intelligence location fields) -- returns the canonical HOT_MARKETS casing so a
// HotMarketCache lookup (keyed by that exact casing) succeeds regardless of how the visitor
// capitalised what they typed.
export function findHotMarket(city: string, area: string): HotMarket | null {
  const c = city.trim().toLowerCase();
  const a = area.trim().toLowerCase();
  return HOT_MARKETS.find((m) => m.city.toLowerCase() === c && m.area.toLowerCase() === a) ?? null;
}

// The one place the `${city}|${area}|${propertyType}` composite key format is defined -- the
// cron refresh job, the overview endpoint's cache lookup, and (indirectly, via Prisma) the
// HotMarketCache table itself all need to agree on this exact format.
export function hotMarketCacheId(city: string, area: string, propertyType: string): string {
  return `${city}|${area}|${propertyType}`;
}
