// ─────────────────────────────────────────────────────────────────────────────
// EDITABLE LOCALITY LIST -- the single config file for locality matching and price links.
// (There are no /prices pages: links go to /ai-intelligence, and /prices/* 301-redirects there.)
//
// To add a locality: append a { name, zone } entry under its city. To remove one: delete the
// line. Pages, the /prices index, the sitemap, the daily refresh rotation and the "nearby"
// links all derive from this list automatically -- nothing else needs editing.
//
// `zone` only drives the "Nearby localities" links (same-zone localities link to each other).
// `aliases` are alternate spellings visitors type, so "Hitech City" and "HITEC City" resolve to
// the same cached price.
// ─────────────────────────────────────────────────────────────────────────────

import { findHotMarketBySlug } from "@/lib/hotMarkets";

export interface LocalityEntry { name: string; zone: string; aliases?: string[] }

export interface CityConfig {
  name: string;
  slug: string;
  country: string;
  currencyCode: string;
  // Property types shown on each /prices page for this city (values from lib/hotMarkets.ts
  // PROPERTY_TYPES). Each extra type is one more live engine call per refresh -- keep it lean.
  propertyTypes: string[];
  localities: LocalityEntry[];
}

export const PRICE_CITIES: CityConfig[] = [
  {
    name: "Hyderabad", slug: "hyderabad", country: "India", currencyCode: "INR",
    propertyTypes: ["apartment", "villa", "plot"],
    localities: [
      // West / IT corridor
      { name: "Kokapet", zone: "west" },
      { name: "Gachibowli", zone: "west" },
      { name: "Financial District", zone: "west", aliases: ["fin district"] },
      { name: "Nanakramguda", zone: "west" },
      { name: "Narsingi", zone: "west" },
      { name: "Kondapur", zone: "west" },
      { name: "Madhapur", zone: "west" },
      { name: "HITEC City", zone: "west", aliases: ["hitech city", "hi-tech city", "hitec"] },
      { name: "Manikonda", zone: "west" },
      { name: "Puppalguda", zone: "west" },
      { name: "Nallagandla", zone: "west" },
      { name: "Tellapur", zone: "west" },
      { name: "Kollur", zone: "west" },
      { name: "Mokila", zone: "west" },
      { name: "Gopanpally", zone: "west" },
      { name: "Shankarpally", zone: "west" },
      // North-west
      { name: "Kukatpally", zone: "northwest" },
      { name: "Miyapur", zone: "northwest" },
      { name: "Bachupally", zone: "northwest" },
      { name: "Nizampet", zone: "northwest" },
      { name: "Pragathi Nagar", zone: "northwest" },
      { name: "Chandanagar", zone: "northwest" },
      { name: "Ameenpur", zone: "northwest" },
      { name: "Beeramguda", zone: "northwest" },
      { name: "Patancheru", zone: "northwest" },
      { name: "Bowrampet", zone: "northwest" },
      // Central
      { name: "Banjara Hills", zone: "central" },
      { name: "Jubilee Hills", zone: "central" },
      { name: "Begumpet", zone: "central" },
      { name: "Somajiguda", zone: "central" },
      { name: "Ameerpet", zone: "central" },
      { name: "Himayatnagar", zone: "central" },
      { name: "Film Nagar", zone: "central" },
      { name: "Secunderabad", zone: "central" },
      // North
      { name: "Kompally", zone: "north" },
      { name: "Medchal", zone: "north" },
      { name: "Shamirpet", zone: "north" },
      { name: "Alwal", zone: "north" },
      { name: "Bollaram", zone: "north" },
      { name: "Gundlapochampally", zone: "north" },
      // East
      { name: "Uppal", zone: "east" },
      { name: "LB Nagar", zone: "east", aliases: ["l b nagar", "l.b. nagar"] },
      { name: "Pocharam", zone: "east" },
      { name: "Ghatkesar", zone: "east" },
      { name: "Nagole", zone: "east" },
      // South / airport
      { name: "Shamshabad", zone: "south" },
      { name: "Adibatla", zone: "south" },
      { name: "Tukkuguda", zone: "south" },
      { name: "Rajendra Nagar", zone: "south", aliases: ["rajendranagar"] },
      { name: "Maheshwaram", zone: "south" },
    ],
  },
  {
    name: "Bangalore", slug: "bangalore", country: "India", currencyCode: "INR",
    propertyTypes: ["apartment", "villa", "plot"],
    localities: [
      { name: "Whitefield", zone: "east" },
      { name: "Sarjapur Road", zone: "east", aliases: ["sarjapur"] },
      { name: "Marathahalli", zone: "east" },
      { name: "Bellandur", zone: "east" },
      { name: "Indiranagar", zone: "east" },
      { name: "Electronic City", zone: "south" },
      { name: "HSR Layout", zone: "south", aliases: ["hsr"] },
      { name: "Koramangala", zone: "south" },
      { name: "JP Nagar", zone: "south", aliases: ["j p nagar"] },
      { name: "Bannerghatta Road", zone: "south" },
      { name: "Kanakapura Road", zone: "south" },
      { name: "Hebbal", zone: "north" },
      { name: "Yelahanka", zone: "north" },
      { name: "Devanahalli", zone: "north" },
      { name: "Hennur", zone: "north" },
    ],
  },
  {
    name: "Dubai", slug: "dubai", country: "UAE", currencyCode: "AED",
    propertyTypes: ["apartment", "villa"],
    localities: [
      { name: "Dubai Marina", zone: "marina" },
      { name: "Jumeirah Lake Towers", zone: "marina", aliases: ["jlt"] },
      { name: "Palm Jumeirah", zone: "marina" },
      { name: "Al Barsha", zone: "marina" },
      { name: "Al Furjan", zone: "marina" },
      { name: "Downtown Dubai", zone: "central" },
      { name: "Business Bay", zone: "central" },
      { name: "Dubai Creek Harbour", zone: "central", aliases: ["creek harbour"] },
      { name: "Mohammed Bin Rashid City", zone: "central", aliases: ["mbr city", "meydan"] },
      { name: "Jumeirah Village Circle", zone: "new-dubai", aliases: ["jvc"] },
      { name: "Dubai Hills Estate", zone: "new-dubai", aliases: ["dubai hills"] },
      { name: "Arabian Ranches", zone: "new-dubai" },
      { name: "Damac Hills", zone: "new-dubai" },
      { name: "Dubai South", zone: "new-dubai" },
      { name: "Dubai Silicon Oasis", zone: "new-dubai", aliases: ["silicon oasis"] },
    ],
  },
];

// ─── Derived helpers (no editing needed below) ──────────────────────────────

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export interface Locality {
  name: string;
  slug: string;
  zone: string;
  city: string;
  citySlug: string;
  country: string;
  currencyCode: string;
  propertyTypes: string[];
  aliases: string[];
}

export const ALL_LOCALITIES: Locality[] = PRICE_CITIES.flatMap((c) =>
  c.localities.map((l) => ({
    name: l.name,
    slug: slugify(l.name),
    zone: l.zone,
    city: c.name,
    citySlug: c.slug,
    country: c.country,
    currencyCode: c.currencyCode,
    propertyTypes: c.propertyTypes,
    aliases: l.aliases ?? [],
  }))
);

export function findCity(citySlug: string): CityConfig | undefined {
  return PRICE_CITIES.find((c) => c.slug === citySlug);
}

export function findLocality(citySlug: string, localitySlug: string): Locality | undefined {
  return ALL_LOCALITIES.find((l) => l.citySlug === citySlug && l.slug === localitySlug);
}

export function nearbyLocalities(loc: Locality, max = 6): Locality[] {
  return ALL_LOCALITIES.filter((l) => l.citySlug === loc.citySlug && l.zone === loc.zone && l.slug !== loc.slug).slice(0, max);
}

// Cities whose every locality has an area price page (lib/areaPages). Hyderabad first.
export const PAGE_CITIES = ["hyderabad"];

// Where a locality's price lives on the site: its /ai-intelligence/[city]/[area] page (every
// locality in PAGE_CITIES, plus the hot markets), otherwise the AI Intelligence tool pre-filled.
export function localityPath(loc: Pick<Locality, "citySlug" | "slug" | "name" | "city">): string {
  if (PAGE_CITIES.includes(loc.citySlug) || findHotMarketBySlug(loc.citySlug, loc.slug)) return `/ai-intelligence/${loc.citySlug}/${loc.slug}`;
  return `/ai-intelligence?area=${encodeURIComponent(loc.name)}&city=${encodeURIComponent(loc.city)}`;
}

export function cityPath(city: Pick<CityConfig, "name">): string {
  return `/ai-intelligence?city=${encodeURIComponent(city.name)}`;
}

const CITY_ALIASES: Record<string, string> = {
  hyderabad: "hyderabad", secunderabad: "hyderabad", cyberabad: "hyderabad",
  bangalore: "bangalore", bengaluru: "bangalore",
  dubai: "dubai",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Matches free text ("kokapet", "Kokapet, Hyderabad", "flat in hitech city hyd") to a configured
// locality. Used by the shared engine so the same place always resolves to the same cache key,
// whichever tool the visitor typed it into. Returns null for anything not in the list -- those
// still work, they're just keyed by their normalised text instead.
export function matchLocality(text: string): Locality | null {
  const t = ` ${norm(text)} `;
  const cityHint = Object.entries(CITY_ALIASES).find(([alias]) => t.includes(` ${alias} `))?.[1];
  let best: { loc: Locality; len: number } | null = null;
  for (const loc of ALL_LOCALITIES) {
    if (cityHint && loc.citySlug !== cityHint) continue;
    for (const candidate of [loc.name, ...loc.aliases]) {
      const c = norm(candidate);
      if (c && t.includes(` ${c} `) && (!best || c.length > best.len)) best = { loc, len: c.length };
    }
  }
  return best?.loc ?? null;
}

// Every configured locality named in the text, in the order they appear ("Kokapet vs Tellapur"
// -> [Kokapet, Tellapur]). Longer names win over names they contain.
export function findLocalities(text: string, max = 3): Locality[] {
  const t = ` ${norm(text)} `;
  const cityHint = Object.entries(CITY_ALIASES).find(([alias]) => t.includes(` ${alias} `))?.[1];
  const hits: { loc: Locality; at: number; len: number }[] = [];
  for (const loc of ALL_LOCALITIES) {
    if (cityHint && loc.citySlug !== cityHint) continue;
    for (const candidate of [loc.name, ...loc.aliases]) {
      const c = norm(candidate);
      const at = c ? t.indexOf(` ${c} `) : -1;
      if (at >= 0) { hits.push({ loc, at, len: c.length }); break; }
    }
  }
  const kept = hits.filter((h) => !hits.some((o) => o !== h && o.len > h.len && o.at <= h.at && o.at + o.len >= h.at + h.len));
  const seen = new Set<string>();
  return kept.sort((a, b) => a.at - b.at).filter((h) => !seen.has(h.loc.slug + h.loc.citySlug) && seen.add(h.loc.slug + h.loc.citySlug)).slice(0, max).map((h) => h.loc);
}
