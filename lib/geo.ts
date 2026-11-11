// M7: map centre + nearby places from OpenStreetMap. Community data (may be incomplete) --
// always shown with the OSM attribution and the date fetched. Both services are free but
// rate-limited, so responses are cached on our side (Nominatim 30 days, Overpass 7 days) and
// only requested when a visitor scrolls to the map.

const UA = "PropKnown/1.0 (raghupinnelli@gmail.com)";
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors (ODbL)";

export interface LatLon { lat: number; lon: number }

export async function geocodeArea(query: string): Promise<LatLon | null> {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in,ae`, {
    headers: { "User-Agent": UA, "Accept-Language": "en" }, next: { revalidate: 30 * 86400 }, signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const j = (await res.json().catch(() => [])) as { lat?: string; lon?: string }[];
  const lat = Number(j[0]?.lat), lon = Number(j[0]?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

export function distanceKm(a: LatLon, b: LatLon): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export const CATEGORIES = {
  schools: { label: "Schools", filter: 'nwr["amenity"="school"]' },
  hospitals: { label: "Hospitals", filter: 'nwr["amenity"="hospital"]' },
  transit: { label: "Metro & rail stations", filter: 'nwr["railway"="station"]' },
  malls: { label: "Malls", filter: 'nwr["shop"="mall"]' },
  parks: { label: "Parks", filter: 'nwr["leisure"="park"]["name"]' },
} as const;
export type Category = keyof typeof CATEGORIES;

export interface NearbyPlace { name: string; distanceKm: number }
export type Nearby = Record<Category, { total: number; nearest: NearbyPlace[] }>;

interface OsmEl { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

// Classify one OSM element into our categories (pure, so it can be unit-tested).
export function categorise(tags: Record<string, string>): Category | null {
  if (tags.amenity === "school") return "schools";
  if (tags.amenity === "hospital") return "hospitals";
  if (tags.railway === "station") return "transit";
  if (tags.shop === "mall") return "malls";
  if (tags.leisure === "park" && tags.name) return "parks";
  return null;
}

export function summarise(center: LatLon, elements: OsmEl[], perCategory = 5): Nearby {
  const out = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, { total: 0, nearest: [] as NearbyPlace[] }])) as Nearby;
  const seen = new Set<string>();
  for (const el of elements) {
    const pos = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
    const cat = el.tags ? categorise(el.tags) : null;
    if (!pos || !cat) continue;
    const name = el.tags?.["name:en"] || el.tags?.name || "";
    const key = `${cat}|${name.toLowerCase()}`;
    if (name && seen.has(key)) continue;
    if (name) seen.add(key);
    out[cat].total++;
    if (name) out[cat].nearest.push({ name: name.slice(0, 80), distanceKm: distanceKm(center, { lat: pos.lat, lon: pos.lon }) });
  }
  for (const c of Object.values(out)) c.nearest = c.nearest.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, perCategory);
  return out;
}

const OVERPASS_HOSTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

export async function nearbyPlaces(center: LatLon, radiusM = 3000): Promise<Nearby | null> {
  const around = `(around:${radiusM},${center.lat.toFixed(5)},${center.lon.toFixed(5)})`;
  const q = `[out:json][timeout:25];(${Object.values(CATEGORIES).map((c) => `${c.filter}${around};`).join("")});out center tags 250;`;
  // Public Overpass servers are slow from cloud regions, so ask all of them at once (POST, as
  // Overpass recommends for longer queries) and take the first good answer. The API route caches
  // a successful result, so this happens rarely.
  const one = async (host: string): Promise<Nearby> => {
    const res = await fetch(host, {
      method: "POST",
      headers: { "User-Agent": UA, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(q)}`, cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`${host} answered ${res.status}`);
    const j = (await res.json()) as { elements?: OsmEl[] };
    if (!j?.elements) throw new Error(`${host}: no elements`);
    return summarise(center, j.elements);
  };
  try {
    return await Promise.any(OVERPASS_HOSTS.map(one));
  } catch (e) {
    const errs = e instanceof AggregateError ? e.errors.map((x) => (x instanceof Error ? x.message : String(x))) : [String(e)];
    console.warn(`[geo] all Overpass servers failed: ${errs.join(" | ")} -- falling back to Nominatim`);
    return nearbyViaNominatim(center, radiusM);
  }
}

// Fallback when Overpass is unreachable (it times out from Vercel's Mumbai region): Nominatim
// place search inside the same box, one category per request, 1.1 s apart (its usage policy).
// Nominatim returns at most 40 per search, so a count of 40 means "40 or more" (capped).
const NOMINATIM: Record<Category, { q: string; types: string[] }> = {
  schools: { q: "school", types: ["amenity/school"] },
  hospitals: { q: "hospital", types: ["amenity/hospital"] },
  transit: { q: "railway station", types: ["railway/station", "public_transport/station"] },
  malls: { q: "shopping mall", types: ["shop/mall"] },
  parks: { q: "park", types: ["leisure/park"] },
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function nearbyViaNominatim(center: LatLon, radiusM = 3000): Promise<Nearby | null> {
  const dLat = radiusM / 111_000, dLon = dLat / Math.cos((center.lat * Math.PI) / 180);
  const viewbox = [center.lon - dLon, center.lat + dLat, center.lon + dLon, center.lat - dLat].map((n) => n.toFixed(5)).join(",");
  const elements: OsmEl[] = [];
  let answered = 0;
  for (const [cat, n] of Object.entries(NOMINATIM) as [Category, (typeof NOMINATIM)[Category]][]) {
    if (answered) await sleep(1100);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&bounded=1&limit=40&viewbox=${viewbox}&q=${encodeURIComponent(n.q)}`, {
      headers: { "User-Agent": UA, "Accept-Language": "en" }, next: { revalidate: 30 * 86400 }, signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (!res?.ok) continue;
    answered++;
    const rows = (await res.json().catch(() => [])) as { lat: string; lon: string; name?: string; category?: string; type?: string }[];
    for (const r of rows) {
      if (!n.types.includes(`${r.category}/${r.type}`)) continue;
      const pos = { lat: Number(r.lat), lon: Number(r.lon) };
      if (distanceKm(center, pos) > radiusM / 1000) continue;
      // Tag it so categorise() files it under this category.
      const tags: Record<string, string> = { name: r.name ?? "" };
      if (cat === "schools") tags.amenity = "school"; else if (cat === "hospitals") tags.amenity = "hospital";
      else if (cat === "transit") tags.railway = "station"; else if (cat === "malls") tags.shop = "mall"; else tags.leisure = "park";
      elements.push({ lat: pos.lat, lon: pos.lon, tags });
    }
  }
  return answered ? summarise(center, elements) : null;
}

export function osmEmbedUrl(c: LatLon, spanDeg = 0.03): string {
  const bbox = [c.lon - spanDeg, c.lat - spanDeg * 0.7, c.lon + spanDeg, c.lat + spanDeg * 0.7].map((n) => n.toFixed(5)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${c.lat.toFixed(5)},${c.lon.toFixed(5)}`;
}
