import { NextRequest, NextResponse } from "next/server";

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

  if (unit === "acres") {
    return `"${location}" agriculture farm land price per acre ${year} ${year - 1} real estate sale`;
  }
  if (unit === "sqyard") {
    return `"${location}" plot residential land price per square yard ${year} ${year - 1} for sale`;
  }
  const typeLabel =
    propertyType === "villa"       ? "villa luxury"      :
    propertyType === "house"       ? "independent house" :
    propertyType === "commercial"  ? "commercial office" : "apartment flat";

  // Location quoted first so search engines rank it as primary keyword
  return `"${location}" ${typeLabel} price per sqft ${year} ${year - 1} for sale ${portals}`;
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
    signal: AbortSignal.timeout(9000),
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
  const benchmarks = unit === "sqyard" ? `
INDIA sq.yard benchmarks — each locality is DISTINCT, pick the EXACT match:
- Jubilee Hills / Banjara Hills (Hyderabad ultra-prime): ₹1,20,000–2,50,000/sq.yd
- Kokapet Golf View / Neopolis (Hyderabad IT premium+): ₹65,000–1,10,000/sq.yd
- Financial District / Nanakramguda (Hyderabad IT premium): ₹70,000–1,20,000/sq.yd
- Gachibowli (Hyderabad IT high-mid): ₹50,000–85,000/sq.yd
- Kondapur / Madhapur (Hyderabad IT mid): ₹35,000–58,000/sq.yd
- Manikonda / Puppalaguda (Hyderabad mid): ₹28,000–48,000/sq.yd
- KPHB / Miyapur / Kukatpally (Hyderabad mid-affordable): ₹18,000–32,000/sq.yd
- Medchal / Ameenpur / Kompally (peripheral): ₹10,000–20,000/sq.yd
- Shamshabad / Shadnagar (outer): ₹6,000–12,000/sq.yd
- Nalgonda / Miryalaguda (rural): ₹2,500–6,000/sq.yd` : unit === "acres" ? `
INDIA acre benchmarks:
- Near Hyderabad (<30km): Shankarpally, Moinabad, Chevella: ₹1.2Cr–3Cr/acre
- Mid-ring Hyderabad (30–60km): Medchal, Ameenpur, Patancheru: ₹60L–1.5Cr/acre
- Outer ring Hyderabad (60–100km): Shadnagar, Vikarabad, Bibinagar: ₹25L–70L/acre
- Distant Telangana (100km+): Miryalaguda, Nalgonda, Suryapet: ₹8L–25L/acre
- Bangalore outskirts (<40km): Devanahalli, Nelamangala: ₹80L–2Cr/acre
- Mumbai outskirts (<50km): Karjat, Khopoli: ₹50L–1.5Cr/acre` : `
LOCALITY-SPECIFIC sq.ft benchmarks (SECONDARY — use live data above first):
⚠️ CRITICAL: Every locality below has a DISTINCT price — never average them together.

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
- Whitefield (IT premium): ₹8,500–14,500/sqft
- Sarjapur Road (IT high): ₹8,000–13,000/sqft
- HSR Layout / Bellandur (mid-high): ₹7,500–12,000/sqft
- Electronic City (IT mid): ₹5,500–8,500/sqft

MUMBAI / PUNE:
- Bandra West / Juhu (ultra-prime): ₹45,000–90,000/sqft
- Andheri West / Powai (mid): ₹18,000–32,000/sqft
- Thane / Navi Mumbai (affordable): ₹9,000–16,000/sqft
- Hinjewadi Pune (IT hub): ₹7,500–13,000/sqft
- Baner / Balewadi Pune (mid): ₹9,000–15,000/sqft

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
  : `PRIORITY: Extract the most specific price-per-${unitLabel} figure from the data above for THIS EXACT locality: "${location}". The benchmark table below is SECONDARY.`}
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

Return ONLY a valid JSON object — no markdown, no code fences, no explanations:

{
  "locationName": "Full area name, City, Country",
  "currency": "${currency.code}",
  "currencySymbol": "${currency.symbol}",
  "currentPricePerSqft": <number — price per ${unitLabel} in ${currency.code} for "${location}" specifically>,
  "pricePerSqftUnit": "${unitKey}",
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

// ─── Fallback ─────────────────────────────────────────────────────────────────

function mkFallback(location: string, unit: string, currency: CurrencyInfo) {
  const y        = new Date().getFullYear();
  const unitKey  = unit === "sqyard" ? "sqyard" : unit === "acres" ? "acres" : "sqft";
  const basePrices: Record<string, Record<string, number>> = {
    in: { sqft: 5500,    sqyard: 18000,   acres: 4000000  },
    ae: { sqft: 1800,    sqyard: 16200,   acres: 78000000 },
    gb: { sqft: 600,     sqyard: 5400,    acres: 2500000  },
    us: { sqft: 350,     sqyard: 3150,    acres: 1500000  },
    sg: { sqft: 1800,    sqyard: 16200,   acres: 80000000 },
    ca: { sqft: 600,     sqyard: 5400,    acres: 2000000  },
    au: { sqft: 500,     sqyard: 4500,    acres: 1800000  },
  };
  const base  = basePrices[currency.code === "INR" ? "in" : currency.code.toLowerCase().slice(0,2)]?.[unitKey]
             ?? basePrices.in[unitKey];
  const scale = 1.08;
  const hist  = [y-4, y-3, y-2, y-1, y].map((yr, i) => ({ year: yr, value: Math.round(base / Math.pow(scale, 4 - i)) }));
  const fore  = [1,2,3,4,5].map((n) => ({ year: y + n, value: Math.round(base * Math.pow(scale, n)) }));
  return {
    locationName: location, currency: currency.code, currencySymbol: currency.symbol,
    currentPricePerSqft: base, pricePerSqftUnit: unitKey,
    priceHistory5yr: hist, priceForecast5yr: fore,
    growthRate: 8.0, trend: "Stable", rentalYield: 3.5, investmentRating: 6.5,
    bestFor: "long-term appreciation", dataSource: "ai_only" as const,
    dataSourceLabel: "AI estimate (limited live data)",
    summary: `${location} shows stable market conditions with consistent end-user demand and infrastructure growth supporting prices.`,
    keyDrivers: ["Steady residential demand", "Infrastructure improvements", "Growing employment base", "Moderate supply"],
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
  dataSource: DataSource,
  dataSourceLabel: string,
  currency: CurrencyInfo,
  bayutPricePsf?: number
): Record<string, unknown> {
  const y    = new Date().getFullYear();
  // For Bayut: lock the price to the computed median — Gemini can't override it
  const now  = dataSource === "bayut_data" && bayutPricePsf
    ? bayutPricePsf
    : (Number(raw.currentPricePerSqft) || 5500);

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
    locationName:        (raw.locationName    as string) || location,
    currency:            currency.code,                   // enforced from detection
    currencySymbol:      currency.symbol,                 // enforced from detection
    currentPricePerSqft: now,
    pricePerSqftUnit:    (raw.pricePerSqftUnit as string) || "sqft",
    priceHistory5yr:     hist,
    priceForecast5yr:    fore,
    growthRate:          Number(raw.growthRate)     || 8,
    trend,
    rentalYield:         Number(raw.rentalYield)    || 3.5,
    investmentRating:    Number(raw.investmentRating) || 6.5,
    bestFor:             (raw.bestFor  as string) || "long-term investment",
    dataSource,
    dataSourceLabel,
    summary:             (raw.summary  as string) || `${location} shows stable market dynamics.`,
    keyDrivers:          Array.isArray(raw.keyDrivers) ? raw.keyDrivers : ["Strong demand", "Good connectivity", "Infrastructure growth", "Growing employment"],
  };
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 2048 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Gemini ${res.status}`);
  return (data.candidates?.[0]?.content?.parts?.[0]?.text as string) ?? "";
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { location, propertyType, unit } =
    await req.json() as { location?: string; propertyType?: string; unit?: string };

  if (!location?.trim()) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }

  const loc          = location.trim();
  const resolvedUnit = unit ?? "sqft";
  const propType     = propertyType ?? "apartment";
  const geminiKey    = process.env.GEMINI_API_KEY;
  const tavilyKey    = process.env.TAVILY_API_KEY;
  const rapidApiKey  = process.env.RAPIDAPI_KEY;

  // ── Step 0: Detect country + currency ────────────────────────────────────
  const { countryCode, currency } = await detectCurrency(loc);

  if (!geminiKey) {
    return NextResponse.json(mkFallback(loc, resolvedUnit, currency));
  }

  // ── Step 1: Real data — Bayut (UAE) or Tavily (elsewhere) ────────────────
  let realDataBlock:   string | null = null;
  let dataSource:      DataSource    = "ai_only";
  let dataSourceLabel: string        = "AI estimate (limited live data)";
  let bayutPricePsf:   number | undefined;
  let dataType:        "bayut" | "tavily" | "none" = "none";

  if (countryCode === "ae" && rapidApiKey) {
    // ── Bayut for UAE ───────────────────────────────────────────────────────
    try {
      const bayutResult = await fetchBayutData(loc, propType, rapidApiKey);
      if (bayutResult && bayutResult.count >= 2) {
        realDataBlock  = bayutResult.snippets;
        dataSource     = "bayut_data";
        dataSourceLabel = `Based on ${bayutResult.count} current Bayut listings (asking prices)`;
        bayutPricePsf  = bayutResult.pricePerSqft;
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
  if (!realDataBlock && tavilyKey) {
    try {
      const tavilyQuery = buildTavilyQuery(loc, propType, resolvedUnit, countryCode);
      console.log(`[Tavily] query for "${loc}": ${tavilyQuery}`);
      const { snippets, hasData } = await fetchTavilyContext(loc, propType, resolvedUnit, countryCode, tavilyKey);
      if (hasData) {
        realDataBlock  = snippets;
        dataSource     = "real_data";
        dataSourceLabel = "Based on current web listings";
        dataType       = "tavily";
        console.log(`[Tavily] got data for "${loc}"`);
      } else {
        console.warn(`[Tavily] no useful data for "${loc}"`);
      }
    } catch (e) {
      console.warn("[Tavily] fetch failed (non-fatal):", e);
    }
  }

  // ── Step 2: Build Gemini prompt ──────────────────────────────────────────
  const prompt = getPrompt(loc, propType, resolvedUnit, currency, countryCode, realDataBlock, dataType, bayutPricePsf);

  // ── Step 3: Call Gemini (2 attempts) ─────────────────────────────────────
  let raw: Record<string, unknown> | undefined;
  try {
    raw = parseGemini(await callGemini(geminiKey, prompt));
  } catch (e1) {
    console.error("Gemini attempt 1 failed:", e1);
    try {
      raw = parseGemini(await callGemini(geminiKey, prompt));
    } catch (e2) {
      console.error("Gemini attempt 2 failed:", e2);
      return NextResponse.json(mkFallback(loc, resolvedUnit, currency));
    }
  }

  try {
    const result = normalise(raw!, loc, dataSource, dataSourceLabel, currency, bayutPricePsf);
    console.log(`[market-intel] RESULT: "${loc}" → ${currency.code} ${result.currentPricePerSqft}/${resolvedUnit} (source: ${dataSource})`);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(mkFallback(loc, resolvedUnit, currency));
  }
}
