import { NextRequest, NextResponse } from "next/server";
import { getUsageStatus, checkAndConsume } from "@/lib/usageLimit";

const GEMINI_MODEL = "gemini-2.5-flash";

// ─── Country / currency ────────────────────────────────────────────────────────

interface CurrencyInfo { code: string; symbol: string; name: string; }

const COUNTRY_CURRENCY: Record<string, CurrencyInfo> = {
  in: { code: "INR", symbol: "₹",    name: "Indian Rupee"       },
  ae: { code: "AED", symbol: "AED ", name: "UAE Dirham"          },
  gb: { code: "GBP", symbol: "£",    name: "British Pound"       },
  us: { code: "USD", symbol: "$",    name: "US Dollar"           },
  sg: { code: "SGD", symbol: "S$",   name: "Singapore Dollar"    },
  ca: { code: "CAD", symbol: "CA$",  name: "Canadian Dollar"     },
  au: { code: "AUD", symbol: "A$",   name: "Australian Dollar"   },
  nz: { code: "NZD", symbol: "NZ$",  name: "New Zealand Dollar"  },
  qa: { code: "QAR", symbol: "QAR ", name: "Qatari Riyal"        },
  sa: { code: "SAR", symbol: "SAR ", name: "Saudi Riyal"         },
  de: { code: "EUR", symbol: "€",    name: "Euro"                },
  fr: { code: "EUR", symbol: "€",    name: "Euro"                },
  es: { code: "EUR", symbol: "€",    name: "Euro"                },
  it: { code: "EUR", symbol: "€",    name: "Euro"                },
  nl: { code: "EUR", symbol: "€",    name: "Euro"                },
  jp: { code: "JPY", symbol: "¥",    name: "Japanese Yen"        },
  cn: { code: "CNY", symbol: "¥",    name: "Chinese Yuan"        },
  hk: { code: "HKD", symbol: "HK$",  name: "Hong Kong Dollar"    },
  th: { code: "THB", symbol: "฿",    name: "Thai Baht"           },
};

// Fast heuristic — avoids a Nominatim round-trip for common cities
function inferCountryCode(location: string): string | null {
  const loc = location.toLowerCase();
  const check = (keywords: string[], code: string) =>
    keywords.some((k) => loc.includes(k)) ? code : null;

  return (
    check(["dubai", "abu dhabi", "sharjah", "ajman", "ras al khaimah", "fujairah",
            "palm jumeirah", "business bay", "jvc", "jlt", "downtown dubai",
            "deira", "bur dubai", "al barsha", "meydan", "dubai south",
            "dubai marina", "jumeirah village"], "ae") ??
    check(["london", "manchester", "birmingham", "glasgow", "edinburgh", "leeds",
            "bristol", "liverpool", "nottingham", "sheffield", "kensington",
            "chelsea", "mayfair", "canary wharf", "oxford", "cambridge",
            "england", "scotland", "wales", " uk"], "gb") ??
    check(["new york", "manhattan", "brooklyn", "queens", "bronx", "los angeles",
            "chicago", "houston", "san francisco", "miami", "boston", "seattle",
            "washington dc", "dallas", "atlanta", "las vegas", "denver",
            "san diego", "phoenix", "usa", "united states"], "us") ??
    check(["singapore", "orchard", "marina bay sands", "sentosa", "jurong",
            "tampines", "bedok", "ang mo kio", "woodlands"], "sg") ??
    check(["toronto", "vancouver", "calgary", "montreal", "ottawa",
            "edmonton", "winnipeg", "canada"], "ca") ??
    check(["sydney", "melbourne", "brisbane", "perth", "adelaide",
            "canberra", "gold coast", "australia"], "au") ??
    check(["doha", "qatar"], "qa") ??
    check(["riyadh", "jeddah", "mecca", "medina", "saudi"], "sa") ??
    check(["tokyo", "osaka", "kyoto", "japan"], "jp") ??
    check(["bangkok", "phuket", "pattaya", "thailand"], "th") ??
    check(["hong kong"], "hk") ??
    check(["berlin", "munich", "frankfurt", "hamburg", "germany"], "de") ??
    check(["paris", "lyon", "marseille", "france"], "fr") ??
    // Indian cities — default for ambiguous names
    check(["hyderabad", "bangalore", "bengaluru", "mumbai", "delhi", "pune",
            "chennai", "kolkata", "goa", "jaipur", "ahmedabad", "surat",
            "lucknow", "noida", "gurugram", "gurgaon", "indore", "coimbatore",
            "visakhapatnam", "vijayawada", "nalgonda", "medchal", "kokapet",
            "gachibowli", "nallagandla", "kondapur", "whitefield", "sarjapur",
            "bandra", "andheri", "thane", "navi mumbai"], "in") ??
    null
  );
}

// Nominatim fallback for ambiguous locations (5 s timeout, non-blocking)
async function getCountryCodeFromNominatim(location: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1`,
      {
        headers: {
          "User-Agent": "PropKnown/1.0 (raghupinnelli@gmail.com)",
          "Accept-Language": "en",
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return (data[0]?.address?.country_code as string)?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

async function detectCurrency(location: string): Promise<{ countryCode: string; currency: CurrencyInfo }> {
  let code = inferCountryCode(location);
  if (!code) {
    code = await getCountryCodeFromNominatim(location);
  }
  // Default to India when unknown
  const finalCode = code ?? "in";
  return {
    countryCode: finalCode,
    currency: COUNTRY_CURRENCY[finalCode] ?? COUNTRY_CURRENCY.in,
  };
}

// ─── Bayut API (UAE only) ─────────────────────────────────────────────────────

interface BayutHit {
  price?: number;
  area?: number;
  floorArea?: number;
  title?: string;
  location?: Array<{ name?: string; externalID?: string }>;
  rooms?: string | number;
  baths?: string | number;
  category?: Array<{ nameSingular?: string }>;
  externalID?: string;
}

interface BayutAutocompleteHit {
  externalID?: string;
  id?: string;
  name?: string;
  nameSingular?: string;
  level?: string;
}

// Step 1: Resolve location to Bayut externalID via autocomplete
async function bayutAutoComplete(location: string, apiKey: string): Promise<string | null> {
  // Strip trailing country qualifier for Bayut search (e.g. "Dubai Marina, Dubai" → "Dubai Marina")
  const q = location.split(",")[0].trim();
  try {
    const res = await fetch(
      `https://bayut14.p.rapidapi.com/auto-complete?query=${encodeURIComponent(q)}&hitsPerPage=5&lang=en`,
      {
        headers: {
          "x-rapidapi-host": "bayut14.p.rapidapi.com",
          "x-rapidapi-key": apiKey,
        },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hits: BayutAutocompleteHit[] = data?.hits ?? (Array.isArray(data) ? data : []);
    if (hits.length === 0) return null;
    // Prefer neighbourhood/area level over city level
    const preferred = hits.find((h) => h.level && !["city", "country"].includes(h.level.toLowerCase())) ?? hits[0];
    return preferred?.externalID ?? preferred?.id ?? null;
  } catch {
    return null;
  }
}

// Step 2: Fetch live listings from Bayut
async function bayutSearchListings(
  locationExternalID: string,
  propertyType: string,
  apiKey: string
): Promise<BayutHit[]> {
  const categoryMap: Record<string, string> = {
    apartment: "4", villa: "3", house: "3",
    commercial: "8", plot: "1", agriculture: "1",
  };

  const params = new URLSearchParams({
    purpose: "for-sale",
    hitsPerPage: "25",
    page:        "0",
    lang:        "en",
    locationExternalIDs: locationExternalID,
  });
  const cat = categoryMap[propertyType];
  if (cat) params.set("categoryExternalID", cat);

  const res = await fetch(
    `https://bayut14.p.rapidapi.com/search-property?${params}`,
    {
      headers: {
        "x-rapidapi-host": "bayut14.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error(`Bayut search ${res.status}`);
  const data = await res.json();
  return data?.hits ?? data?.data ?? (Array.isArray(data) ? data : []);
}

interface BayutResult {
  pricePerSqft: number;
  minPrice: number;
  maxPrice: number;
  medianTotalPrice: number;
  count: number;
  snippets: string;
}

async function fetchBayutData(
  location: string,
  propertyType: string,
  apiKey: string
): Promise<BayutResult | null> {
  // Step 1 — autocomplete
  const locId = await bayutAutoComplete(location, apiKey);
  if (!locId) {
    console.warn("Bayut autocomplete returned no ID for:", location);
    return null;
  }

  // Step 2 — listings
  const hits = await bayutSearchListings(locId, propertyType, apiKey);
  if (!hits.length) return null;

  // Compute price-per-sqft from each listing
  const ppsfts: number[] = [];
  const totalPrices: number[] = [];

  for (const h of hits) {
    const price = Number(h.price ?? 0);
    const area  = Number(h.area ?? h.floorArea ?? 0);
    if (price > 50000 && area > 100) {          // sanity filters
      ppsfts.push(price / area);
      totalPrices.push(price);
    }
  }

  if (ppsfts.length < 2) return null;

  ppsfts.sort((a, b) => a - b);
  totalPrices.sort((a, b) => a - b);

  const median = (arr: number[]) => {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };

  const medPpsft = Math.round(median(ppsfts));
  const minPpsft = Math.round(ppsfts[0]);
  const maxPpsft = Math.round(ppsfts[ppsfts.length - 1]);
  const medTotal = Math.round(median(totalPrices));

  const snippets = [
    `BAYUT LIVE LISTING DATA — ${hits.length} active "${propertyType}" listings in ${location}:`,
    `Median asking price per sqft: AED ${medPpsft.toLocaleString()}`,
    `Price-per-sqft range: AED ${minPpsft.toLocaleString()} – AED ${maxPpsft.toLocaleString()}`,
    `Median total asking price: AED ${medTotal.toLocaleString()}`,
    `Based on ${ppsfts.length} listings with valid price+area data.`,
    `Source: bayut.com (largest UAE property portal). These are ASKING prices, not transaction prices.`,
  ].join("\n");

  return {
    pricePerSqft:      medPpsft,
    minPrice:          minPpsft,
    maxPrice:          maxPpsft,
    medianTotalPrice:  medTotal,
    count:             ppsfts.length,
    snippets,
  };
}

// ─── Tavily (all other countries) ────────────────────────────────────────────

const PORTAL_HINTS: Record<string, string> = {
  in: "magicbricks 99acres housing.com proptiger",
  gb: "rightmove zoopla onthemarket",
  us: "zillow realtor.com redfin trulia",
  sg: "propertyguru 99.co srx",
  au: "realestate.com.au domain.com.au",
  ca: "realtor.ca zolo.ca",
  qa: "propertyfinder bayut",
  sa: "propertyfinder.sa aqar.sa",
  ae: "propertyfinder bayut.com",
};

function buildTavilyQuery(
  location: string,
  propertyType: string,
  unit: string,
  countryCode: string
): string {
  const year    = new Date().getFullYear();
  const portals = PORTAL_HINTS[countryCode] ?? "real estate listing";
  const locQuoted = `"${location}"`;

  // Plot / residential land — explicit area, unit, and "current asking rate" framing so
  // results are plot-specific and don't drift toward a "starting from" teaser price.
  // "average price range" phrasing encourages search results/snippets that state a min-max
  // band rather than just a single figure, which we use for the richer range display.
  if (propertyType === "plot" || unit === "sqyard") {
    return `residential plot average price range per sqyard in ${locQuoted} ${year} current rate gaj site rate for sale ${portals}`;
  }

  // Agriculture / farm land
  if (propertyType === "agriculture" || unit === "acres") {
    return `agriculture farm land average price range per acre in ${locQuoted} ${year} current rate for sale ${portals}`;
  }

  // Local land units (ankanam, cent, guntha) — API always prices these as sqyard
  if (["ankanam", "cent", "guntha"].includes(unit)) {
    return `plot land average price range per sqyard in ${locQuoted} ${year} current rate for sale ${portals}`;
  }

  const typeLabel =
    propertyType === "villa"       ? "villa"              :
    propertyType === "house"       ? "independent house"  :
    propertyType === "commercial"  ? "commercial office"  : "apartment";

  return `${typeLabel} average price range per sqft in ${locQuoted} ${year} current rate for sale ${portals}`;
}

interface TavilyResult { title: string; url: string; content: string; score: number; }
interface TavilyResponse { answer?: string; results?: TavilyResult[]; }

async function fetchTavilyContext(
  location: string,
  propertyType: string,
  unit: string,
  countryCode: string,
  apiKey: string
): Promise<{ snippets: string; hasData: boolean }> {
  const query = buildTavilyQuery(location, propertyType, unit, countryCode);

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key:        apiKey,
      query,
      search_depth:   "basic",
      include_answer: true,
      max_results:    6,
    }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);

  const data: TavilyResponse = await res.json();
  const parts: string[] = [];

  if (data.answer?.trim()) {
    parts.push(`WEB SEARCH SUMMARY:\n${data.answer.trim()}`);
  }
  if (Array.isArray(data.results)) {
    const snippets = data.results
      .slice(0, 5)
      .filter((r) => r.content?.trim())
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.content.slice(0, 450).trim()}`)
      .join("\n\n");
    if (snippets) parts.push(`WEB LISTING SNIPPETS:\n${snippets}`);
  }

  const combined = parts.join("\n\n");
  return { snippets: combined, hasData: combined.length > 60 };
}

// ─── Structured locality benchmarks (code-level, not just prompt text) ───────
// Same numbers as the prompt's benchmark tables below, but queryable in JS so we can
// sanity-clamp Gemini/Tavily output instead of just hoping the model follows instructions.
// Real-estate web search results often surface promotional "starting from" teaser prices
// (the cheapest unit in a project) which drag the extracted figure well below the real
// prevailing rate — this table catches and corrects that.
interface Benchmark { keywords: string[]; unit: "sqyard" | "sqft" | "acres"; min: number; max: number; }

const BENCHMARKS: Benchmark[] = [
  // ── India — plot / land, per sq.yard ──
  { keywords: ["jubilee hills", "banjara hills"],                          unit: "sqyard", min: 120000, max: 250000 },
  { keywords: ["kokapet", "neopolis", "golf view"],                        unit: "sqyard", min: 55000,  max: 100000 },
  { keywords: ["financial district", "nanakramguda"],                     unit: "sqyard", min: 60000,  max: 110000 },
  { keywords: ["gachibowli"],                                              unit: "sqyard", min: 40000,  max: 75000 },
  { keywords: ["kondapur", "madhapur"],                                    unit: "sqyard", min: 30000,  max: 55000 },
  { keywords: ["manikonda", "puppalaguda"],                                unit: "sqyard", min: 22000,  max: 42000 },
  { keywords: ["tellapur", "osman nagar"],                                 unit: "sqyard", min: 15000,  max: 28000 },
  { keywords: ["nallagandla", "serilingampally"],                          unit: "sqyard", min: 20000,  max: 38000 },
  { keywords: ["kphb", "miyapur", "kukatpally"],                           unit: "sqyard", min: 15000,  max: 28000 },
  { keywords: ["bachupally", "nizampet"],                                  unit: "sqyard", min: 12000,  max: 22000 },
  { keywords: ["kompally"],                                                unit: "sqyard", min: 8000,   max: 15000 },
  { keywords: ["medchal", "ameenpur", "shamirpet"],                        unit: "sqyard", min: 6000,   max: 12000 },
  { keywords: ["shamshabad", "shadnagar"],                                 unit: "sqyard", min: 4000,   max: 9000 },
  { keywords: ["nalgonda", "miryalaguda"],                                 unit: "sqyard", min: 2000,   max: 5000 },

  // ── Bangalore — plot / land, per sq.yard ──
  { keywords: ["indiranagar", "koramangala"],                              unit: "sqyard", min: 90000,  max: 180000 },
  { keywords: ["whitefield"],                                              unit: "sqyard", min: 45000,  max: 80000 },
  { keywords: ["sarjapur"],                                                unit: "sqyard", min: 35000,  max: 60000 },
  { keywords: ["hsr layout", "bellandur"],                                 unit: "sqyard", min: 40000,  max: 70000 },
  { keywords: ["electronic city"],                                         unit: "sqyard", min: 22000,  max: 40000 },

  // ── Pune — plot / land, per sq.yard ──
  { keywords: ["hinjewadi"],                                               unit: "sqyard", min: 35000,  max: 60000 },
  { keywords: ["baner", "balewadi"],                                       unit: "sqyard", min: 42000,  max: 70000 },

  // ── Chennai — plot / land, per sq.yard ──
  { keywords: ["adyar", "besant nagar"],                                   unit: "sqyard", min: 130000, max: 240000 },
  { keywords: ["anna nagar"],                                              unit: "sqyard", min: 85000,  max: 160000 },
  { keywords: ["velachery"],                                               unit: "sqyard", min: 48000,  max: 80000 },
  { keywords: ["omr", "old mahabalipuram"],                                unit: "sqyard", min: 38000,  max: 70000 },
  { keywords: ["porur"],                                                   unit: "sqyard", min: 32000,  max: 55000 },
  { keywords: ["tambaram"],                                                unit: "sqyard", min: 18000,  max: 35000 },

  // ── Delhi NCR — plot / land, per sq.yard ──
  { keywords: ["vasant vihar", "greater kailash", "defence colony", "south delhi"], unit: "sqyard", min: 450000, max: 850000 },
  { keywords: ["golf course road", "dlf phase"],                           unit: "sqyard", min: 160000, max: 320000 },
  { keywords: ["golf course extension", "sector 65", "sector 66"],         unit: "sqyard", min: 75000,  max: 140000 },
  { keywords: ["dwarka"],                                                  unit: "sqyard", min: 65000,  max: 110000 },
  { keywords: ["sohna road", "sohna"],                                     unit: "sqyard", min: 35000,  max: 65000 },
  { keywords: ["noida sector 150", "noida expressway", "sector 150"],      unit: "sqyard", min: 55000,  max: 95000 },
  { keywords: ["greater noida"],                                          unit: "sqyard", min: 28000,  max: 48000 },
  { keywords: ["rohini"],                                                  unit: "sqyard", min: 48000,  max: 80000 },

  // ── India — land, per acre ──
  { keywords: ["shankarpally", "moinabad", "chevella"],                    unit: "acres",  min: 12000000, max: 30000000 },
  { keywords: ["patancheru"],                                              unit: "acres",  min: 6000000,  max: 15000000 },
  { keywords: ["vikarabad", "bibinagar"],                                  unit: "acres",  min: 2500000,  max: 7000000 },
  { keywords: ["suryapet"],                                                unit: "acres",  min: 800000,   max: 2500000 },
  { keywords: ["devanahalli", "nelamangala"],                              unit: "acres",  min: 8000000,  max: 20000000 },
  { keywords: ["karjat", "khopoli"],                                       unit: "acres",  min: 5000000,  max: 15000000 },
  { keywords: ["sonipat", "karnal", "palwal"],                             unit: "acres",  min: 4000000,  max: 12000000 },
  { keywords: ["chengalpattu", "thiruvallur"],                             unit: "acres",  min: 1500000,  max: 5000000 },

  // ── India — apartments/villas/houses, per sq.ft ──
  { keywords: ["jubilee hills", "banjara hills"],                          unit: "sqft",   min: 15000, max: 28000 },
  { keywords: ["financial district", "nanakramguda"],                     unit: "sqft",   min: 11000, max: 19000 },
  { keywords: ["kokapet", "neopolis", "golf view"],                        unit: "sqft",   min: 10000, max: 16000 },
  { keywords: ["gachibowli"],                                              unit: "sqft",   min: 8500,  max: 14000 },
  { keywords: ["kondapur", "madhapur"],                                    unit: "sqft",   min: 6500,  max: 10500 },
  { keywords: ["manikonda", "puppalaguda"],                                unit: "sqft",   min: 5500,  max: 9000 },
  { keywords: ["kphb", "miyapur", "kukatpally"],                           unit: "sqft",   min: 4500,  max: 7000 },
  { keywords: ["medchal", "ameenpur"],                                     unit: "sqft",   min: 3200,  max: 5500 },
  { keywords: ["shamshabad", "shadnagar", "maheshwaram"],                  unit: "sqft",   min: 2200,  max: 4000 },
  { keywords: ["nalgonda", "miryalaguda"],                                 unit: "sqft",   min: 1200,  max: 2800 },
  { keywords: ["indiranagar", "koramangala"],                              unit: "sqft",   min: 12000, max: 22000 },
  { keywords: ["whitefield"],                                              unit: "sqft",   min: 10000, max: 16000 },
  { keywords: ["sarjapur"],                                                unit: "sqft",   min: 8000,  max: 13000 },
  { keywords: ["hsr layout", "bellandur"],                                 unit: "sqft",   min: 7500,  max: 12000 },
  { keywords: ["electronic city"],                                         unit: "sqft",   min: 5500,  max: 8500 },
  { keywords: ["bandra", "juhu"],                                          unit: "sqft",   min: 45000, max: 90000 },
  { keywords: ["andheri", "powai"],                                        unit: "sqft",   min: 18000, max: 32000 },
  { keywords: ["thane", "navi mumbai"],                                    unit: "sqft",   min: 9000,  max: 16000 },
  { keywords: ["hinjewadi"],                                               unit: "sqft",   min: 7500,  max: 13000 },
  { keywords: ["baner", "balewadi"],                                       unit: "sqft",   min: 9000,  max: 15000 },

  // ── Chennai, per sq.ft — cross-checked against live listings (99acres/nobroker):
  // OMR average ~₹7,250-13,000/sqft, confirming the range below ──
  { keywords: ["adyar", "besant nagar"],                                   unit: "sqft",   min: 15000, max: 26000 },
  { keywords: ["anna nagar"],                                              unit: "sqft",   min: 9500,  max: 16000 },
  { keywords: ["velachery"],                                               unit: "sqft",   min: 7500,  max: 12000 },
  { keywords: ["omr", "old mahabalipuram"],                                unit: "sqft",   min: 7000,  max: 13000 },
  { keywords: ["porur"],                                                   unit: "sqft",   min: 5500,  max: 9000 },
  { keywords: ["tambaram"],                                                unit: "sqft",   min: 3800,  max: 6500 },

  // ── Delhi NCR, per sq.ft — Golf Course Road cross-checked against live listings
  // (99acres/nobroker): average ~₹27,000/sqft, ultra-premium up to ₹65,000+/sqft ──
  { keywords: ["vasant vihar", "greater kailash", "defence colony", "south delhi"], unit: "sqft", min: 28000, max: 50000 },
  { keywords: ["golf course road", "dlf phase"],                           unit: "sqft",   min: 22000, max: 42000 },
  { keywords: ["golf course extension", "sector 65", "sector 66"],         unit: "sqft",   min: 11000, max: 18000 },
  { keywords: ["dwarka"],                                                  unit: "sqft",   min: 9500,  max: 15000 },
  { keywords: ["sohna road", "sohna"],                                     unit: "sqft",   min: 6500,  max: 11000 },
  { keywords: ["noida sector 150", "noida expressway", "sector 150"],      unit: "sqft",   min: 8500,  max: 14000 },
  { keywords: ["greater noida"],                                          unit: "sqft",   min: 4200,  max: 7500 },
  { keywords: ["rohini"],                                                  unit: "sqft",   min: 7500,  max: 12000 },

  // ── Dubai, per sq.ft ──
  { keywords: ["palm jumeirah", "downtown dubai"],                         unit: "sqft",   min: 3000, max: 5500 },
  { keywords: ["dubai marina"],                                            unit: "sqft",   min: 1800, max: 3000 },
  { keywords: ["business bay"],                                            unit: "sqft",   min: 1500, max: 2400 },
  { keywords: ["jumeirah village circle", "jvc"],                          unit: "sqft",   min: 900,  max: 1400 },
  { keywords: ["jumeirah lake towers", "jlt"],                             unit: "sqft",   min: 1000, max: 1600 },
  { keywords: ["dubai south", "discovery gardens"],                        unit: "sqft",   min: 700,  max: 1100 },
  { keywords: ["meydan", "mohammed bin rashid"],                           unit: "sqft",   min: 1800, max: 3200 },
  { keywords: ["al barsha"],                                                unit: "sqft",   min: 900,  max: 1500 },

  // ── UK, per sq.ft ──
  { keywords: ["kensington", "chelsea", "mayfair"],                        unit: "sqft",   min: 1500, max: 4000 },
  { keywords: ["canary wharf", "city of london"],                          unit: "sqft",   min: 800,  max: 1400 },
  { keywords: ["manchester", "birmingham", "leeds"],                       unit: "sqft",   min: 200,  max: 450 },

  // ── USA, per sq.ft ──
  { keywords: ["manhattan"],                                               unit: "sqft",   min: 1500, max: 4500 },
  { keywords: ["brooklyn", "queens"],                                      unit: "sqft",   min: 800,  max: 1400 },
  { keywords: ["san francisco", "los angeles"],                            unit: "sqft",   min: 800,  max: 1500 },
  { keywords: ["chicago", "houston", "dallas"],                            unit: "sqft",   min: 200,  max: 500 },

  // ── Singapore / Australia / Canada, per sq.ft ──
  { keywords: ["orchard", "marina bay"],                                   unit: "sqft",   min: 2500, max: 4500 },
  { keywords: ["sydney"],                                                  unit: "sqft",   min: 900,  max: 1800 },
  { keywords: ["toronto"],                                                 unit: "sqft",   min: 800,  max: 1400 },
];

// Local land units (ankanam/cent/guntha) are always requested from the API as "sqyard" —
// the frontend converts to the user's selected unit for display, so the plot/sqyard
// benchmark applies to those requests too.
function benchmarkUnitFor(propertyType: string, unit: string): "sqyard" | "sqft" | "acres" {
  if (unit === "acres" || propertyType === "agriculture") return "acres";
  if (unit === "sqyard" || propertyType === "plot") return "sqyard";
  return "sqft";
}

// The BENCHMARKS table is keyed by unit+locality only, with no property-type dimension --
// every sqft-priced type (apartment, villa, house, commercial) was hitting the identical
// bucket, so a villa and an apartment in the same locality got clamped to the same range
// regardless of what Gemini/Tavily actually returned. Villas and independent houses command
// a real premium over apartments in the same micro-market (larger private land share, lower
// density, more exclusivity); commercial office space is typically closer to apartment rates.
// These multipliers scale the shared per-locality sqft benchmark by type rather than
// requiring a fully separate, harder-to-verify benchmark row per type per locality.
const SQFT_TYPE_MULTIPLIER: Record<string, number> = {
  apartment:  1.0,
  house:      1.15,
  villa:      1.3,
  commercial: 1.05,
};

// In peripheral/outer-corridor localities, villas serve a fundamentally different buyer
// segment than the area's typical apartment stock -- large private-plot gated communities
// for an affluent niche, vs. the area's often basic/affordable apartment inventory aimed at
// commuters. That's a much bigger gap than in dense urban IT corridors (Gachibowli, Kondapur
// etc.), where villas and apartments serve a similar buyer pool and a ~25-35% premium holds.
// Verified against real listing data for Medchal (user-confirmed 2026-07, 99acres/
// MagicBricks): actual villa range Rs.8,800-15,600/sqft vs our apartment benchmark of
// Rs.3,200-5,500/sqft -- a ~2.8x ratio, not ~1.3x. Extrapolated to similarly-profiled
// peripheral localities on the same reasoning; only Medchal has been independently verified
// so far -- if another entry here proves off, correct it individually rather than the whole set.
const PERIPHERAL_KEYWORDS = [
  "medchal", "ameenpur", "shamirpet", "shamshabad", "shadnagar", "maheshwaram",
  "nalgonda", "miryalaguda", "kompally", "bachupally", "nizampet",
];
const PERIPHERAL_TYPE_MULTIPLIER: Record<string, number> = {
  villa: 2.8,
  house: 2.3,
};

function findBenchmark(location: string, propertyType: string, unit: string): Benchmark | null {
  const loc = location.toLowerCase();
  const wantUnit = benchmarkUnitFor(propertyType, unit);
  const match = BENCHMARKS.find((b) => b.unit === wantUnit && b.keywords.some((k) => loc.includes(k)));
  if (!match) return null;
  if (wantUnit !== "sqft") return match; // plot/acre benchmarks are already type-distinct

  const isPeripheral = PERIPHERAL_KEYWORDS.some((k) => loc.includes(k));
  const mult = isPeripheral
    ? (PERIPHERAL_TYPE_MULTIPLIER[propertyType] ?? SQFT_TYPE_MULTIPLIER[propertyType] ?? 1.0)
    : (SQFT_TYPE_MULTIPLIER[propertyType] ?? 1.0);
  if (mult === 1.0) return match;
  return { ...match, min: Math.round(match.min * mult), max: Math.round(match.max * mult) };
}

// Derives a realistic min-max price range for the richer UI display. Live Gemini data is now
// the only source ever shown to users (see POST handler — a request is only priced at all
// when Bayut/Tavily found real listing data AND Gemini successfully processed it), so this
// only ever runs for genuinely live-grounded results. Priority: Bayut's own computed range >
// Gemini's self-reported range (when internally consistent with its point price) > a
// synthetic band around the point price. BENCHMARKS is intentionally not consulted here —
// a confirmed-real answer should never be second-guessed by a static table (kept in this
// file for other features to reference, e.g. a future plausibility-check tool, but
// disconnected from anything shown to users as an AI Intelligence price).
function deriveRange(
  currentPrice: number,
  raw: Record<string, unknown>,
  bayutRange?: { min: number; max: number }
): { min: number; max: number } {
  if (bayutRange) return bayutRange;

  const rawMin = Number(raw.priceRangeMin);
  const rawMax = Number(raw.priceRangeMax);
  const geminiRangeOk = rawMin > 0 && rawMax > rawMin && currentPrice >= rawMin * 0.5 && currentPrice <= rawMax * 1.5;
  if (geminiRangeOk) return { min: Math.round(rawMin), max: Math.round(rawMax) };

  return { min: Math.round(currentPrice * 0.85), max: Math.round(currentPrice * 1.25) };
}

// ─── Gemini prompt ────────────────────────────────────────────────────────────

function getPrompt(
  location:      string,
  propertyType:  string,
  unit:          string,
  currency:      CurrencyInfo,
  countryCode:   string,
  realDataBlock: string | null,    // Bayut text OR Tavily text
  dataType:      "bayut" | "tavily" | "none",
  bayutPricePsf?: number           // pre-computed median from Bayut
): string {
  const now = new Date();
  const y   = now.getFullYear();
  const unitLabel = unit === "sqyard" ? "sq.yard" : unit === "acres" ? "acre" : "sq.ft";
  const unitKey   = unit === "sqyard" ? "sqyard"  : unit === "acres" ? "acres" : "sqft";

  const [y1, y2, y3, y4, y5] = [y-4, y-3, y-2, y-1, y];
  const [f1, f2, f3, f4, f5] = [y+1, y+2, y+3, y+4, y+5];

  // ── Fallback benchmark table — GRANULAR PER LOCALITY ─────────────────────
  const benchmarks = (unit === "sqyard" || propertyType === "plot") ? `
INDIA PLOT sq.yard benchmarks — EACH LOCALITY IS DISTINCT. Match the EXACT area name:
- Jubilee Hills / Banjara Hills (Hyderabad ultra-prime): ₹1,20,000–2,50,000/sq.yd
- Kokapet / Neopolis / Golf View (Hyderabad IT premium): ₹55,000–1,00,000/sq.yd
- Financial District / Nanakramguda (Hyderabad IT premium): ₹60,000–1,10,000/sq.yd
- Gachibowli (Hyderabad IT high): ₹40,000–75,000/sq.yd
- Kondapur / Madhapur (Hyderabad IT mid): ₹30,000–55,000/sq.yd
- Manikonda / Puppalaguda (Hyderabad mid): ₹22,000–42,000/sq.yd
- Tellapur / Osman Nagar (Hyderabad west mid-rim): ₹15,000–28,000/sq.yd
- Nallagandla / Serilingampally (Hyderabad west mid): ₹20,000–38,000/sq.yd
- KPHB / Miyapur / Kukatpally (Hyderabad mid-affordable): ₹15,000–28,000/sq.yd
- Bachupally / Nizampet (Hyderabad north mid): ₹12,000–22,000/sq.yd
- Kompally (Hyderabad north peripheral): ₹8,000–15,000/sq.yd
- Medchal / Ameenpur / Shamirpet (outer peripheral): ₹6,000–12,000/sq.yd
- Shamshabad / Shadnagar (outer south): ₹4,000–9,000/sq.yd
- Nalgonda / Miryalaguda (rural): ₹2,000–5,000/sq.yd
- Whitefield / Sarjapur Road (Bangalore IT corridor): ₹35,000–80,000/sq.yd
- Indiranagar / Koramangala (Bangalore prime): ₹90,000–1,80,000/sq.yd
- HSR Layout / Bellandur / Electronic City (Bangalore mid): ₹22,000–70,000/sq.yd
- Hinjewadi / Baner / Balewadi (Pune IT hub): ₹35,000–70,000/sq.yd
- Adyar / Besant Nagar (Chennai ultra-prime coastal): ₹1,30,000–2,40,000/sq.yd
- Anna Nagar (Chennai established prime): ₹85,000–1,60,000/sq.yd
- OMR / Velachery (Chennai IT corridor): ₹38,000–80,000/sq.yd
- Porur / Tambaram (Chennai mid-affordable): ₹18,000–55,000/sq.yd
- Vasant Vihar / GK / Defence Colony (South Delhi ultra-prime): ₹4,50,000–8,50,000/sq.yd
- Golf Course Road / DLF Phases (Gurgaon ultra-prime): ₹1,60,000–3,20,000/sq.yd
- Golf Course Extension / Sohna Road (Gurgaon mid-prime): ₹35,000–1,40,000/sq.yd
- Dwarka / Rohini (Delhi mid): ₹48,000–1,10,000/sq.yd
- Noida Expressway / Sector 150 (premium): ₹55,000–95,000/sq.yd
- Greater Noida (affordable): ₹28,000–48,000/sq.yd
⚠️ CRITICAL: "${location}" must get its OWN price from the exact match above. Never give the same price for different localities.` : unit === "acres" ? `
INDIA acre benchmarks:
- Near Hyderabad (<30km): Shankarpally, Moinabad, Chevella: ₹1.2Cr–3Cr/acre
- Mid-ring Hyderabad (30–60km): Medchal, Ameenpur, Patancheru: ₹60L–1.5Cr/acre
- Outer ring Hyderabad (60–100km): Shadnagar, Vikarabad, Bibinagar: ₹25L–70L/acre
- Distant Telangana (100km+): Miryalaguda, Nalgonda, Suryapet: ₹8L–25L/acre
- Bangalore outskirts (<40km): Devanahalli, Nelamangala: ₹80L–2Cr/acre
- Mumbai outskirts (<50km): Karjat, Khopoli: ₹50L–1.5Cr/acre
- Delhi NCR outskirts (Sonipat, Karnal, Palwal): ₹40L–1.2Cr/acre
- Chennai outskirts (Chengalpattu, Thiruvallur): ₹15L–50L/acre` : `
LOCALITY-SPECIFIC sq.ft benchmarks (SECONDARY — use live data above first):
⚠️ CRITICAL: Every locality below has a DISTINCT price — never average them together.
⚠️ CRITICAL: The figures below are APARTMENT baseline rates for each locality. This request is for "${propertyType}" — adjust accordingly:
- apartment: use the benchmark as-is.
- villa (core urban / IT-corridor localities, e.g. Gachibowli, Kondapur, Whitefield): apply a 25-35% PREMIUM over the apartment benchmark (villas include a larger private land share, lower density, more exclusivity — they cost meaningfully more per sqft than apartments in the same micro-market).
- villa (peripheral / outer-ring / emerging-corridor localities, e.g. Medchal, Shamshabad, Nalgonda, and similar areas far from the core IT/business district): apply a MUCH larger premium — roughly 150-190% over the apartment benchmark (i.e. villa price ≈ 2.5-2.9x the apartment rate). Villas here serve a fundamentally different, more affluent buyer segment (large private-plot gated communities) than the area's typical apartment stock (often basic/affordable commuter housing). Verified real-world example: Medchal apartments ₹3,200-5,500/sqft vs Medchal villas ₹8,800-15,600/sqft (~2.8x) — use this as your calibration reference for any similarly peripheral locality.
- house (independent house): apply the same tiered logic as villa above, at a slightly lower premium (10-20% core-urban, ~130-160% peripheral).
- commercial: apply a 0-10% premium over the apartment benchmark.
Never return the same price for villa and apartment in the same locality — they must differ, and the gap should be much larger in peripheral areas than in core-urban ones.

HYDERABAD (pick the exact sub-locality):
- Jubilee Hills / Banjara Hills (ultra-prime): ₹15,000–28,000/sqft
- Financial District / Nanakramguda (IT premium): ₹11,000–19,000/sqft
- Kokapet Golf View / Neopolis (IT premium): ₹10,000–16,000/sqft
- Gachibowli (IT high): ₹8,500–14,000/sqft
- Kondapur / Madhapur (IT mid): ₹6,500–10,500/sqft
- Manikonda / Puppalaguda (mid): ₹5,500–9,000/sqft
- KPHB / Miyapur / Kukatpally (affordable): ₹4,500–7,000/sqft
- Medchal / Ameenpur (peripheral): ₹3,200–5,500/sqft
- Shamshabad / Shadnagar / Maheshwaram (outer): ₹2,200–4,000/sqft
- Nalgonda / Miryalaguda (rural): ₹1,200–2,800/sqft

BANGALORE:
- Indiranagar / Koramangala (prime): ₹12,000–22,000/sqft
- Whitefield (IT premium): ₹10,000–16,000/sqft
- Sarjapur Road (IT high): ₹8,000–13,000/sqft
- HSR Layout / Bellandur (mid-high): ₹7,500–12,000/sqft
- Electronic City (IT mid): ₹5,500–8,500/sqft

MUMBAI / PUNE:
- Bandra West / Juhu (ultra-prime): ₹45,000–90,000/sqft
- Andheri West / Powai (mid): ₹18,000–32,000/sqft
- Thane / Navi Mumbai (affordable): ₹9,000–16,000/sqft
- Hinjewadi Pune (IT hub): ₹7,500–13,000/sqft
- Baner / Balewadi Pune (mid): ₹9,000–15,000/sqft

CHENNAI (pick the exact sub-locality) — cross-checked against live OMR listing data (~₹7,250–13,000/sqft):
- Adyar / Besant Nagar (ultra-prime coastal): ₹15,000–26,000/sqft
- Anna Nagar (established prime): ₹9,500–16,000/sqft
- OMR / Velachery (IT corridor): ₹7,000–13,000/sqft
- Porur (mid): ₹5,500–9,000/sqft
- Tambaram (affordable/outer): ₹3,800–6,500/sqft

DELHI NCR (pick the exact sub-locality) — Golf Course Road cross-checked against live listing data (~₹27,000/sqft avg, up to ₹65,000+/sqft ultra-premium):
- Vasant Vihar / Greater Kailash / Defence Colony (South Delhi ultra-prime): ₹28,000–50,000/sqft
- Golf Course Road / DLF Phases, Gurgaon (ultra-prime): ₹22,000–42,000/sqft
- Golf Course Extension Road, Gurgaon (prime): ₹11,000–18,000/sqft
- Noida Sector 150 / Expressway (premium): ₹8,500–14,000/sqft
- Dwarka / Rohini, Delhi (mid): ₹7,500–15,000/sqft
- Sohna Road, Gurgaon (mid): ₹6,500–11,000/sqft
- Greater Noida (affordable): ₹4,200–7,500/sqft

UAE DUBAI (pick the exact community):
- Palm Jumeirah / Downtown Dubai: AED 3,000–5,500/sqft
- Dubai Marina (prime waterfront): AED 1,800–3,000/sqft
- Business Bay (commercial-residential): AED 1,500–2,400/sqft
- Jumeirah Village Circle (JVC) (affordable): AED 900–1,400/sqft
- Jumeirah Lake Towers (JLT): AED 1,000–1,600/sqft
- Dubai South / Discovery Gardens: AED 700–1,100/sqft
- Meydan / Mohammed Bin Rashid City: AED 1,800–3,200/sqft
- Al Barsha (mid): AED 900–1,500/sqft

UK:
- Kensington / Chelsea / Mayfair (London prime): £1,500–4,000/sqft
- Canary Wharf / City of London: £800–1,400/sqft
- London Mid (Zones 2-3): £600–1,000/sqft
- Manchester / Birmingham / Leeds: £200–450/sqft

USA:
- Manhattan (NYC) Prime: $1,500–4,500/sqft
- Brooklyn / Queens (NYC) Mid: $800–1,400/sqft
- San Francisco / LA Prime: $800–1,500/sqft
- Chicago / Houston / Dallas: $200–500/sqft

SINGAPORE / AUSTRALIA / CANADA:
- Singapore Prime (Orchard / Marina Bay): SGD 2,500–4,500/sqft
- Singapore Mid: SGD 1,200–2,200/sqft
- Sydney Prime: A$900–1,800/sqft
- Toronto Prime: CA$800–1,400/sqft`;

  // ── Real data section ────────────────────────────────────────────────────
  const realSection = realDataBlock ? `
═══════════════════════════════════════
${dataType === "bayut" ? "LIVE BAYUT.COM LISTING DATA (PRIMARY SOURCE)" : "LIVE WEB LISTING DATA (PRIMARY SOURCE)"}
═══════════════════════════════════════
${realDataBlock}

${dataType === "bayut" && bayutPricePsf
  ? `CRITICAL: The computed median price-per-sqft from Bayut listings is ${currency.symbol}${bayutPricePsf.toLocaleString()}/sqft.
Your "currentPricePerSqft" MUST be ${bayutPricePsf} (the exact Bayut median). Do NOT invent a different figure.`
  : `PRIORITY: Extract the PREVAILING/TYPICAL price-per-${unitLabel} for THIS EXACT locality: "${location}" from the data above. The benchmark table below is SECONDARY.
⚠️ DO NOT use promotional "starting from ₹X" or "from ₹X onwards" teaser prices — those describe the cheapest/smallest unit in one specific project, not the typical rate for the area. Use the median or typical rate implied across the listings/snippets, not the lowest number you see.`}
═══════════════════════════════════════
` : `(No live listing data available — use the locality-specific benchmark table below.)`;

  return `You are a senior real estate market analyst. Generate realistic market intelligence for the SPECIFIC locality: "${location}" (${propertyType} properties).

COUNTRY: ${countryCode.toUpperCase()} | CURRENCY: ${currency.code} (${currency.symbol}) | UNIT: per ${unitLabel}

${realSection}

⚠️ LOCALITY PRICING RULE (MOST IMPORTANT):
Each locality has a DISTINCT price. You MUST differentiate:
- Kokapet vs Gachibowli vs Financial District → different prices (Kokapet ₹10K–16K, Gachibowli ₹8.5K–14K, Financial District ₹11K–19K)
- Dubai Marina vs Business Bay vs JVC → different prices (Marina AED 1,800–3,000, Business Bay AED 1,500–2,400, JVC AED 900–1,400)
- Never return a generic city average. Price the EXACT locality: "${location}"
- If you are uncertain, pick from the MIDDLE of the locality's specific range in the benchmark table

CRITICAL RULES:
1. "currency" MUST be "${currency.code}" and "currencySymbol" MUST be "${currency.symbol}" — never use a different currency.
2. "currentPricePerSqft" = price per ${unitLabel} for the SPECIFIC locality "${location}"${dataType === "bayut" && bayutPricePsf ? ` = EXACTLY ${bayutPricePsf} (from Bayut data)` : " — pick a SPECIFIC value within the locality's range, not the city average"}.
3. "pricePerSqftUnit" MUST be "${unitKey}".
4. History values must show realistic growth leading up to "currentPricePerSqft". Forecast must show projected growth.
5. History and forecast values must be in ${currency.code}, consistent with "currentPricePerSqft".
6. "trend" must be one of: "Bullish", "Stable", or "Cautious".
7. "summary" must mention the SPECIFIC locality "${location}" by name, not just the city.
8. Give the PREVAILING current asking-price rate for typical/comparable properties in this exact micro-market — never a promotional minimum, "starting from" teaser, or distressed-sale outlier. When genuinely uncertain, prefer the middle of the locality's known range over a low guess.
9. "priceRangeMin"/"priceRangeMax" = the realistic current asking-price range for this locality (not the city, not a single teaser project) — "currentPricePerSqft" should sit roughly in the middle-to-upper part of this range, not at the very bottom.
10. "typicalListings" = one short phrase on the kind of properties actually available here right now (e.g. "Mostly 2-3BHK gated-community apartments from mid-size and large developers, with some premium high-rises" or "Primarily HMDA/DTCP-approved open plots in developing layouts") — describe TYPES/segments found in the data, never name specific builders or projects.

Return ONLY a valid JSON object — no markdown, no code fences, no explanations:

{
  "locationName": "Full area name, City, Country",
  "currency": "${currency.code}",
  "currencySymbol": "${currency.symbol}",
  "currentPricePerSqft": <number — price per ${unitLabel} in ${currency.code} for "${location}" specifically>,
  "priceRangeMin": <number — realistic low end of the current asking-price range for this locality>,
  "priceRangeMax": <number — realistic high end of the current asking-price range for this locality>,
  "pricePerSqftUnit": "${unitKey}",
  "typicalListings": "short phrase describing typical property types/segments available in this exact locality",
  "priceHistory5yr": [
    {"year": ${y1}, "value": <number>},
    {"year": ${y2}, "value": <number>},
    {"year": ${y3}, "value": <number>},
    {"year": ${y4}, "value": <number>},
    {"year": ${y5}, "value": <number>}
  ],
  "priceForecast5yr": [
    {"year": ${f1}, "value": <number>},
    {"year": ${f2}, "value": <number>},
    {"year": ${f3}, "value": <number>},
    {"year": ${f4}, "value": <number>},
    {"year": ${f5}, "value": <number>}
  ],
  "growthRate": <annual % e.g. 8.5>,
  "trend": "Bullish" | "Stable" | "Cautious",
  "rentalYield": <gross % e.g. 5.2>,
  "investmentRating": <0–10 with one decimal>,
  "bestFor": "short phrase",
  "summary": "2–3 sentences of analysis specific to ${location} (mention the locality by name)",
  "keyDrivers": ["driver1", "driver2", "driver3", "driver4"]
}

${benchmarks}

Return ONLY the JSON object. No other text.`;
}

// ─── Unavailable state ─────────────────────────────────────────────────────────
// Live Gemini data (grounded in real Bayut/Tavily listings) is now the ONLY source ever
// shown to users as a price — there is no more benchmark-table-generated fallback estimate.
// Whenever live data can't be produced for any reason (no live listings found, Gemini
// quota/auth/network failure, malformed response, etc.), this returns a simple, honest
// "unavailable" result instead of a number that could be mistaken for something real. The
// technical reason is logged server-side for debugging; the user only ever sees one plain,
// friendly message with a retry option.
function unavailableResponse(reason: string) {
  console.warn(`[market-intel] unavailable: ${reason}`);
  return {
    available: false,
    message: "Live market data is temporarily unavailable for this area. Please try again in a moment.",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseGemini(text: string): Record<string, unknown> {
  const t = text.trim();
  if (t.startsWith("{")) { try { return JSON.parse(t); } catch { /**/ } }
  const fenced = t.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { /**/ } }
  const obj = t.match(/(\{[\s\S]+\})/);
  if (obj) { try { return JSON.parse(obj[1]); } catch { /**/ } }
  throw new Error("No valid JSON in Gemini response");
}

type DataSource = "bayut_data" | "real_data" | "ai_only";

function normalise(
  raw: Record<string, unknown>,
  location: string,
  propertyType: string,
  unit: string,
  dataSource: DataSource,
  dataSourceLabel: string,
  currency: CurrencyInfo,
  bayutPricePsf?: number,
  bayutRange?: { min: number; max: number }
): Record<string, unknown> {
  const y = new Date().getFullYear();
  // This only ever runs for genuinely live-grounded data now (Bayut or Tavily-backed
  // "real_data") — the caller never invokes normalise() otherwise. Displayed exactly as
  // returned, with no clamping or range-checking against BENCHMARKS.
  const now = dataSource === "bayut_data" && bayutPricePsf
    ? bayutPricePsf
    : (Number(raw.currentPricePerSqft) || 5500);
  const range = deriveRange(now, raw, bayutRange);

  // Flag (log only) when a live-grounded price falls notably outside its historical
  // BENCHMARKS entry, if one exists — signals that entry may be stale and worth reviewing
  // for other features that still reference it. Never alters what's shown to the user.
  const b = findBenchmark(location, propertyType, unit);
  if (b && (now < b.min * 0.85 || now > b.max * 1.15)) {
    console.warn(`[market-intel] BENCHMARK MISMATCH: live-grounded price for "${location}" (${propertyType}) is ${now}, outside BENCHMARKS range ${b.min}-${b.max} -- this table entry may need reviewing.`);
  }

  const rate = (Number(raw.growthRate) || 8) / 100;

  let hist = raw.priceHistory5yr as { year: number; value: number }[] | undefined;
  if (!Array.isArray(hist) || hist.length < 2) {
    hist = [y-4, y-3, y-2, y-1, y].map((yr, i) => ({
      year: yr, value: Math.round(now / Math.pow(1 + rate, 4 - i)),
    }));
  }

  let fore = raw.priceForecast5yr as { year: number; value: number }[] | undefined;
  if (!Array.isArray(fore) || fore.length < 2) {
    fore = [1,2,3,4,5].map((n) => ({
      year: y + n, value: Math.round(now * Math.pow(1 + rate, n)),
    }));
  }

  const trend = ["Bullish", "Stable", "Cautious"].includes(raw.trend as string)
    ? (raw.trend as string) : "Stable";

  return {
    available:           true,
    locationName:        (raw.locationName    as string) || location,
    currency:            currency.code,                   // enforced from detection
    currencySymbol:      currency.symbol,                 // enforced from detection
    currentPricePerSqft: now,
    priceRangeMin:       range.min,
    priceRangeMax:       range.max,
    pricePerSqftUnit:    (raw.pricePerSqftUnit as string) || "sqft",
    typicalListings:     (raw.typicalListings as string) || "Mix of property types typical for this micro-market — verify specifics with a PropKnown advisor.",
    priceHistory5yr:     hist,
    priceForecast5yr:    fore,
    growthRate:          Number(raw.growthRate)     || 8,
    trend,
    rentalYield:         Number(raw.rentalYield)    || 3.5,
    investmentRating:    Number(raw.investmentRating) || 6.5,
    bestFor:             (raw.bestFor  as string) || "long-term investment",
    dataSource,
    dataSourceLabel,
    summary:             (raw.summary as string) || `${location} shows stable market dynamics.`,
    keyDrivers:          Array.isArray(raw.keyDrivers) ? raw.keyDrivers : ["Strong demand", "Good connectivity", "Infrastructure growth", "Growing employment"],
  };
}

class GeminiQuotaError extends Error {}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // gemini-2.5-flash spends part of maxOutputTokens on internal "thinking" before the
      // visible answer — with thinking left on, the JSON reply was getting truncated
      // mid-object (finishReason: MAX_TOKENS) and every request silently fell back to the
      // generic, non-area-specific estimate. Disabling thinking fixes this.
      generationConfig: { temperature: 0.25, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message ?? `Gemini ${res.status}`;
    if (res.status === 429 || data.error?.status === "RESOURCE_EXHAUSTED") {
      throw new GeminiQuotaError(msg);
    }
    throw new Error(msg);
  }
  return (data.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? "";
}

// ─── Simple in-memory cache (5 minute TTL) ────────────────────────────────────

interface CacheEntry { data: Record<string, unknown>; ts: number; }
const RESULT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): Record<string, unknown> | null {
  const entry = RESULT_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { RESULT_CACHE.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: Record<string, unknown>) {
  // Keep cache bounded
  if (RESULT_CACHE.size > 100) {
    let oldestKey = "";
    let oldestTs  = Infinity;
    RESULT_CACHE.forEach((v, k) => { if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; } });
    if (oldestKey) RESULT_CACHE.delete(oldestKey);
  }
  RESULT_CACHE.set(key, { data, ts: Date.now() });
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { location, propertyType, unit, countUsage } =
    await req.json() as { location?: string; propertyType?: string; unit?: string; countUsage?: boolean };

  if (!location?.trim()) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }

  // Only the AI Intelligence page's own deliberate "Get Market Intelligence" action counts
  // against the anonymous free-check limit -- it sends countUsage:true. The passive "Area
  // Price Insight" fetch on property detail pages (and Price Reality Check's own internal
  // call, which already consumed a check at its own route) never send this flag, so simply
  // browsing listings can't silently burn a visitor's free checks.
  //
  // Gate check is read-only here -- a visitor shouldn't be charged one of their 3 free
  // checks for an attempt that ends up "unavailable" (no live data, Gemini failure, etc.);
  // the counter only actually increments right before a genuine success is returned, below.
  let usage = countUsage ? await getUsageStatus() : null;
  if (usage && !usage.allowed) {
    return NextResponse.json({ error: "usage_limit", ...usage }, { status: 403 });
  }
  // Attaches the honest "X of 3 free checks used" status to every response on this request
  // (success or unavailable) so the frontend can show it without a second round-trip.
  const respond = (body: Record<string, unknown>, status = 200) =>
    NextResponse.json(usage ? { ...body, usage } : body, { status });

  const loc          = location.trim();
  const resolvedUnit = unit ?? "sqft";
  const propType     = propertyType ?? "apartment";
  const geminiKey    = process.env.GEMINI_API_KEY;
  const tavilyKey    = process.env.TAVILY_API_KEY;
  const rapidApiKey  = process.env.RAPIDAPI_KEY;

  // ── Cache check ──────────────────────────────────────────────────────────
  const cacheKey = `${loc}|${propType}|${resolvedUnit}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[market-intel] Cache HIT for "${cacheKey}"`);
    return respond(cached);
  }

  // ── Step 0: Detect country + currency ────────────────────────────────────
  const { countryCode, currency } = await detectCurrency(loc);

  if (!geminiKey) {
    return respond(unavailableResponse("no GEMINI_API_KEY configured"));
  }

  // ── Step 1: Real data — Bayut (UAE) or Tavily (elsewhere) ────────────────
  let realDataBlock:   string | null = null;
  let dataSource:      DataSource    = "ai_only";
  let dataSourceLabel: string        = "";
  let bayutPricePsf:   number | undefined;
  let bayutRange:      { min: number; max: number } | undefined;
  let dataType:        "bayut" | "tavily" | "none" = "none";

  if (countryCode === "ae" && rapidApiKey) {
    // ── Bayut for UAE ───────────────────────────────────────────────────────
    try {
      const bayutResult = await fetchBayutData(loc, propType, rapidApiKey);
      if (bayutResult && bayutResult.count >= 2) {
        realDataBlock  = bayutResult.snippets;
        dataSource     = "bayut_data";
        dataSourceLabel = `Based on live market analysis — ${bayutResult.count} current Bayut listings`;
        bayutPricePsf  = bayutResult.pricePerSqft;
        bayutRange     = { min: bayutResult.minPrice, max: bayutResult.maxPrice };
        dataType       = "bayut";
        console.log(`[Bayut] ${loc}: AED ${bayutResult.pricePerSqft}/sqft from ${bayutResult.count} listings`);
      } else {
        console.warn("[Bayut] insufficient results, falling back to Tavily for UAE");
      }
    } catch (e) {
      console.warn("[Bayut] fetch failed (non-fatal):", e);
    }
  }

  // Tavily: use for non-UAE, OR as UAE fallback if Bayut failed
  // Capped at 5.5s so we proceed to Gemini faster if Tavily is slow
  if (!realDataBlock && tavilyKey) {
    try {
      const tavilyQuery = buildTavilyQuery(loc, propType, resolvedUnit, countryCode);
      console.log(`[Tavily] query for "${loc}": ${tavilyQuery}`);
      const tavilyPromise = fetchTavilyContext(loc, propType, resolvedUnit, countryCode, tavilyKey);
      const timeout       = new Promise<null>((res) => setTimeout(() => res(null), 5500));
      const tavilyResult  = await Promise.race([tavilyPromise, timeout]);
      if (tavilyResult && tavilyResult.hasData) {
        realDataBlock  = tavilyResult.snippets;
        dataSource     = "real_data";
        dataSourceLabel = "Based on live market analysis — current web listings";
        dataType       = "tavily";
        console.log(`[Tavily] got data for "${loc}"`);
      } else {
        console.warn(`[Tavily] no/slow data for "${loc}"`);
      }
    } catch (e) {
      console.warn("[Tavily] fetch failed (non-fatal):", e);
    }
  }

  // Live Gemini data is the only source ever shown to users — if neither Bayut nor Tavily
  // found real listing data, there's nothing for Gemini to ground an answer in, so there's
  // no point spending an API call (and quota) on a result we'd discard anyway. Not cached:
  // a moment later this same query might succeed once live data is available.
  if (dataType === "none") {
    return respond(unavailableResponse(`no live listing data found for "${loc}" (${propType})`));
  }

  // ── Step 2: Build Gemini prompt ──────────────────────────────────────────
  const prompt = getPrompt(loc, propType, resolvedUnit, currency, countryCode, realDataBlock, dataType, bayutPricePsf);

  // ── Step 3: Call Gemini (2 attempts) ─────────────────────────────────────
  let raw: Record<string, unknown> | undefined;
  try {
    raw = parseGemini(await callGemini(geminiKey, prompt));
  } catch (e1) {
    console.error("Gemini attempt 1 failed:", e1);
    if (e1 instanceof GeminiQuotaError) {
      // Retrying won't help — quota is exhausted for the window.
      return respond(unavailableResponse(`Gemini quota exhausted for "${loc}": ${e1.message}`));
    }
    try {
      raw = parseGemini(await callGemini(geminiKey, prompt));
    } catch (e2) {
      console.error("Gemini attempt 2 failed:", e2);
      const reason = e2 instanceof Error ? e2.message : String(e2);
      return respond(unavailableResponse(`Gemini call failed for "${loc}": ${reason}`));
    }
  }

  try {
    const result = normalise(raw!, loc, propType, resolvedUnit, dataSource, dataSourceLabel, currency, bayutPricePsf, bayutRange);
    console.log(`[market-intel] RESULT: "${loc}" → ${currency.code} ${result.currentPricePerSqft}/${resolvedUnit} (source: ${dataSource})`);
    setCache(cacheKey, result);
    // Only now, on a confirmed genuine success, actually consume one of the visitor's free
    // checks -- everything above this point was read-only.
    if (countUsage) usage = await checkAndConsume();
    return respond(result);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return respond(unavailableResponse(`failed to process AI response for "${loc}": ${reason}`));
  }
}
