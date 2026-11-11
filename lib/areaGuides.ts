import { prisma } from "@/lib/db";
import { sourceHosts } from "@/lib/engine/sources";
import { allAreaPages, areaPath } from "@/lib/areaPages";
import { quotas, utcDay } from "@/lib/engine/usage";

// Global Area Price Guides (/area-prices). An area is listed ONLY once it has a sourced, dated
// price in the cache -- from the daily pre-fetch below, a visitor's search, or any other check.

// ---- Editable pre-fetch list: localities the daily job checks (names only, never prices) ----
export const PREFETCH: { country: string; city: string; areas: string[] }[] = [
  { country: "India", city: "Hyderabad", areas: ["Kokapet", "Gachibowli", "Kondapur", "Financial District", "HITEC City", "Madhapur", "Kukatpally", "Miyapur", "Tellapur", "Narsingi", "Manikonda", "Bachupally", "Kompally", "Shamshabad", "Medchal", "Banjara Hills", "Jubilee Hills"] },
  { country: "India", city: "Bengaluru", areas: ["Whitefield", "Koramangala", "Sarjapur Road", "Electronic City", "HSR Layout", "Hebbal", "Yelahanka", "Indiranagar", "Bellandur"] },
  { country: "India", city: "Mumbai", areas: ["Andheri West", "Bandra West", "Powai", "Thane West", "Kharghar", "Goregaon", "Worli", "Chembur", "Malad West"] },
  { country: "India", city: "Pune", areas: ["Hinjewadi", "Wakad", "Baner", "Kharadi", "Hadapsar", "Wagholi"] },
  { country: "India", city: "Chennai", areas: ["OMR", "Velachery", "Anna Nagar", "Porur", "Tambaram", "Perumbakkam"] },
  { country: "India", city: "Delhi NCR", areas: ["Golf Course Extension Road, Gurugram", "Sohna Road, Gurugram", "Sector 150, Noida", "Greater Noida West", "Dwarka"] },
  { country: "India", city: "Kolkata", areas: ["New Town", "Rajarhat", "Salt Lake", "EM Bypass"] },
  { country: "India", city: "Ahmedabad", areas: ["SG Highway", "Bopal", "Gota", "Shela"] },
  { country: "India", city: "Visakhapatnam", areas: ["Madhurawada", "Rushikonda", "MVP Colony", "Gajuwaka"] },
  { country: "India", city: "Vijayawada", areas: ["Benz Circle", "Gollapudi", "Poranki"] },
  { country: "India", city: "Kochi", areas: ["Kakkanad", "Edappally", "Vyttila"] },
  { country: "India", city: "Coimbatore", areas: ["Saravanampatti", "Peelamedu", "RS Puram"] },
  { country: "UAE", city: "Dubai", areas: ["Dubai Marina", "Business Bay", "Jumeirah Village Circle", "Downtown Dubai", "Dubai Hills Estate", "Jumeirah Lake Towers", "Palm Jumeirah"] },
  { country: "UAE", city: "Abu Dhabi", areas: ["Al Reem Island", "Yas Island", "Saadiyat Island", "Al Raha Beach"] },
  { country: "UAE", city: "Sharjah", areas: ["Al Nahda", "Aljada", "Al Majaz"] },
  { country: "United Kingdom", city: "London", areas: ["Canary Wharf", "Stratford", "Croydon", "Wembley", "Battersea"] },
  { country: "Singapore", city: "Singapore", areas: ["Jurong East", "Punggol", "Tampines", "Bukit Timah"] },
  { country: "Canada", city: "Toronto", areas: ["Downtown Toronto", "North York", "Mississauga", "Brampton"] },
  { country: "USA", city: "New Jersey", areas: ["Edison", "Jersey City"] },
  { country: "USA", city: "Bay Area", areas: ["Fremont", "Sunnyvale"] },
  { country: "USA", city: "Dallas", areas: ["Irving", "Frisco", "Plano"] },
  { country: "USA", city: "Seattle", areas: ["Bellevue", "Redmond"] },
];
export const PREFETCH_PER_DAY = 30;
export const REFRESH_AFTER_DAYS = 30;

const CURRENCY_COUNTRY: Record<string, string> = { INR: "India", AED: "UAE", GBP: "United Kingdom", SGD: "Singapore", CAD: "Canada", USD: "USA" };
const CITY_COUNTRY = new Map(PREFETCH.flatMap((p) => [[p.city.toLowerCase(), p.country] as const]));
const CITY_ALIASES: Record<string, string> = { bangalore: "Bengaluru", vizag: "Visakhapatnam", gurgaon: "Delhi NCR", gurugram: "Delhi NCR", noida: "Delhi NCR", "new delhi": "Delhi NCR", delhi: "Delhi NCR" };

export function placeFromName(locationName: string, currency?: string | null): { area: string; city: string; country: string; rawCity?: string } | null {
  const parts = locationName.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  const hasCountry = /^(india|uae|united arab emirates|uk|united kingdom|singapore|canada|usa|united states)$/i.test(last);
  // "Hyderabad, India" is a city-level row, not an area -- except city-states ("Jurong East, Singapore").
  if (hasCountry && parts.length < 3 && !/^singapore$/i.test(last)) return null;
  const area = parts[0];
  const rawCity = hasCountry ? (parts.length >= 3 ? parts[parts.length - 2] : last) : parts[1];
  const city = CITY_ALIASES[rawCity.toLowerCase()] ?? rawCity;
  if (area.toLowerCase() === city.toLowerCase()) return null; // a city-level row, not an area
  const country = (hasCountry ? ({ uae: "UAE", "united arab emirates": "UAE", uk: "United Kingdom", "united states": "USA" } as Record<string, string>)[last.toLowerCase()] ?? last : null)
    ?? CITY_COUNTRY.get(city.toLowerCase()) ?? (currency ? CURRENCY_COUNTRY[currency] : undefined) ?? "Other";
  return rawCity !== city ? { area, city, country, rawCity } : { area, city, country };
}

export const sameCity = (a: string, b: string) => (CITY_ALIASES[a.toLowerCase()] ?? a).toLowerCase() === (CITY_ALIASES[b.toLowerCase()] ?? b).toLowerCase();

export interface GuideArea { area: string; city: string; country: string; href: string; updatedAt: string }

// Every area with at least one sourced price, grouped later by country -> city.
export async function loadGuideAreas(): Promise<GuideArea[]> {
  const rows = await prisma.locationMarketCache.findMany({
    where: { pricePerUnit: { gt: 0 }, NOT: { locationKey: { startsWith: "project/" } } },
    select: { locationName: true, currency: true, fetchedAt: true, data: true },
  }).catch(() => []);
  const pages = allAreaPages();
  const out = new Map<string, GuideArea>();
  for (const r of rows) {
    if (!sourceHosts((r.data as { sourceUrls?: unknown } | null)?.sourceUrls).length) continue;
    const pl = placeFromName(r.locationName, r.currency);
    if (!pl) continue;
    const key = `${pl.city}|${pl.area}`.toLowerCase();
    const page = pages.find((p) => p.area.toLowerCase() === pl.area.toLowerCase() && (p.city.toLowerCase() === pl.city.toLowerCase() || CITY_ALIASES[p.city.toLowerCase()] === pl.city));
    // Link with the city spelling the price was saved under ("Bangalore"), so it opens the cached result.
    const href = page ? areaPath(page) : `/ai-intelligence?area=${encodeURIComponent(pl.area)}&city=${encodeURIComponent(pl.rawCity ?? pl.city)}`;
    const prev = out.get(key);
    if (!prev || prev.updatedAt < r.fetchedAt.toISOString()) out.set(key, { area: pl.area, city: pl.city, country: pl.country, href, updatedAt: r.fetchedAt.toISOString() });
  }
  return Array.from(out.values());
}

// "Popular searches": the locations visitors actually searched most (last 90 days) that have data.
export async function popularSearches(areas: GuideArea[], take = 8): Promise<GuideArea[]> {
  const rows = await prisma.aiQuery.groupBy({ by: ["location"], where: { location: { not: null }, createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) } }, _count: true, orderBy: { _count: { location: "desc" } }, take: 40 }).catch(() => []);
  const picked: GuideArea[] = [];
  for (const r of rows) {
    const pl = r.location ? placeFromName(r.location) : null;
    const hit = pl && areas.find((a) => a.area.toLowerCase() === pl.area.toLowerCase() && a.city.toLowerCase() === pl.city.toLowerCase());
    if (hit && !picked.includes(hit)) picked.push(hit);
    if (picked.length >= take) break;
  }
  return picked;
}

// Quota headroom for the pre-fetch job: stop before the free tiers run out (leaves room for visitors).
export async function quotaHeadroom(): Promise<{ ok: boolean; note: string }> {
  const q = Object.fromEntries(quotas().map((x) => [x.provider, x]));
  const today = utcDay(), monthStart = `${today.slice(0, 7)}-01`;
  const rows = await prisma.apiUsage.findMany({ where: { day: { gte: monthStart } } }).catch(() => []);
  const geminiToday = rows.filter((r) => r.provider === "gemini" && r.day === today).reduce((a, r) => a + r.calls, 0);
  const tavilyMonth = rows.filter((r) => r.provider === "tavily").reduce((a, r) => a + r.calls, 0);
  if (geminiToday >= q.gemini.limit * 0.6) return { ok: false, note: `Gemini ${geminiToday}/${q.gemini.limit} today` };
  if (tavilyMonth >= q.tavily.limit * 0.7) return { ok: false, note: `Tavily ${tavilyMonth}/${q.tavily.limit} this month` };
  return { ok: true, note: `Gemini ${geminiToday}/${q.gemini.limit} today, Tavily ${tavilyMonth}/${q.tavily.limit} this month` };
}
