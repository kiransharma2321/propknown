// Shared AI Intelligence market-data core -- extracted out of app/api/market-intel/route.ts so
// it's importable from multiple routes (the single-type endpoint, the new multi-type overview
// endpoint, and the hot-market cache refresh cron) without duplicating any pricing/grounding
// logic. Next.js route.ts files can only export recognised HTTP handlers (GET/POST/etc.) plus a
// small set of config constants -- an arbitrary exported function like computeMarketIntel()
// fails route-module type validation there, which is why this lives in lib/ instead.
//
// Every line of logic below is verbatim from the pre-refactor route.ts -- this file is a pure
// relocation, not a rewrite. No pricing, grounding, extraction, or honesty behavior changed.

// Quota is tracked per-model on the free tier -- when the primary model's daily quota is
// exhausted, retrying the same model is pointless, but a different model has its own separate
// quota bucket and can genuinely still succeed. flash-lite as fallback (not primary) here:
// this route needs reliable structured JSON extraction from real search context, where
// flash's extra capability is worth it as the first attempt.
const GEMINI_MODEL_PRIMARY  = "gemini-2.5-flash";
const GEMINI_MODEL_FALLBACK = "gemini-2.5-flash-lite";

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

// Fast heuristic — avoids a Nominatim round-trip for common cities. This is location/country
// metadata (which currency to use, which search portals to hint), not a price -- it never
// determines or narrows a displayed number, so it's out of scope for the hardcoded-price audit.
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

// ─── Unit conversion (single source of truth, server-side) ────────────────────
// Matches the frontend's UNIT_TO_SQFT (app/(public)/ai-intelligence/page.tsx) exactly --
// per-sqyard = per-sqft × 9, per-ankanam = per-sqyard × 4 (= sqft × 36), per-cent = per-sqyard
// × 48.4 (= sqft × 435.6), per-guntha = per-sqyard × 121 (= sqft × 1089), per-acre = per-sqyard
// × 4840 (= sqft × 43560), per-ground = per-sqyard × 266.67 (= sqft × 2400), per-sqm = per-sqft
// × 10.764. sqft is the canonical internal unit: every parsed/estimated rate gets normalised to
// per-sqft first, then converted to whatever unit the request actually asked for right before
// the response is built -- this is what prevents a sqft-denominated source and a
// sqyard-denominated source from ever being averaged together as if they were the same number.
const UNIT_TO_SQFT: Record<string, number> = {
  sqft: 1, sqyard: 9, sqm: 10.764, acre: 43560, acres: 43560,
  cent: 435.6, guntha: 1089, ankanam: 36, ground: 2400,
};

function targetUnitFactor(propertyType: string, unit: string): number {
  if (unit === "acres" || propertyType === "agriculture") return UNIT_TO_SQFT.acre;
  if (unit === "sqyard" || propertyType === "plot") return UNIT_TO_SQFT.sqyard;
  return UNIT_TO_SQFT.sqft;
}

// ─── Bayut API (UAE only) ─────────────────────────────────────────────────────
// Already grounded in real live listings (actual price/area fields from actual for-sale
// listings, not text parsing) -- nothing here is a hardcoded price, so this section is
// unchanged by the delisting-of-hardcoded-benchmarks fix below.

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
  in: "magicbricks 99acres squareyards housing.com proptiger",
  gb: "rightmove zoopla onthemarket",
  us: "zillow realtor.com redfin trulia",
  sg: "propertyguru 99.co srx",
  au: "realestate.com.au domain.com.au",
  ca: "realtor.ca zolo.ca",
  qa: "propertyfinder bayut",
  sa: "propertyfinder.sa aqar.sa",
  ae: "propertyfinder bayut.com",
};

// Builds a query specific to location + property type + country + the LOCALLY-correct unit
// (plots priced per sq yard in India, per sqft for apartments/villas everywhere, per acre for
// farmland) -- this has to work for ANY location typed in, not just a pre-listed set, so it's
// driven entirely by propertyType/unit/countryCode, never by a lookup table of named areas.
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
  if (propertyType === "plot" || unit === "sqyard") {
    return `${locQuoted} residential plot land price per square yard per sqft ${year} current rate gaj site rate for sale ${portals}`;
  }

  // Agriculture / farm land
  if (propertyType === "agriculture" || unit === "acres") {
    return `${locQuoted} agriculture farm land price per acre ${year} current rate for sale ${portals}`;
  }

  // Local land units (ankanam, cent, guntha) — API always prices these as sqyard
  if (["ankanam", "cent", "guntha"].includes(unit)) {
    return `${locQuoted} plot land price per square yard per sqft ${year} current rate for sale ${portals}`;
  }

  const typeLabel =
    propertyType === "villa"       ? "villa"              :
    propertyType === "house"       ? "independent house"  :
    propertyType === "commercial"  ? "commercial office"  : "apartment";

  return `${locQuoted} ${typeLabel} price per sqft ${year} current rate for sale ${portals}`;
}

interface TavilyResult { title: string; url: string; content: string; score: number; }
interface TavilyResponse { answer?: string; results?: TavilyResult[]; }

async function fetchTavilyContext(
  location: string,
  propertyType: string,
  unit: string,
  countryCode: string,
  apiKey: string
): Promise<{ snippets: string; hasData: boolean; sourceUrls: string[]; rawText: string; extractionText: string }> {
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
  const extractionParts: string[] = [];
  const sourceUrls: string[] = [];

  // Tavily's own `answer` field (a generated summary of the search) is deliberately never added
  // to `parts` (what Gemini sees) or `extractionParts` (what the regex parses). It's a paraphrase
  // of the same source snippets below, not an independent document -- and it has been observed
  // fabricating numbers that aren't actually in any source. Two confirmed cases from testing:
  // (1) a Kompally, Hyderabad plot query where every source snippet was a contentless locality
  // overview page with zero price mentions, yet the summary confidently stated "prices... are
  // expected to be around Rs 1,500-2,000"; (2) a Kensington, London query where the summary
  // claimed "average price per sqft is around £50,000" and a "£11,250 to £46,000" per-sqft range,
  // when what the actual source snippets contained were whole-property guide prices for
  // multi-million-pound mansions (e.g. "£46,000,000 One Hyde Park") that its summarizer seems to
  // have misread as per-sqft figures. Feeding that summary to Gemini let it inherit the same
  // fabrication. Relying only on the raw listing snippets -- the actual source documents -- is
  // what makes "grounded in real data" a true claim rather than one more layer of paraphrase.
  void data.answer;
  const isLandQuery = propertyType === "plot" || propertyType === "agriculture" || unit === "sqyard" || unit === "acres";
  // A result titled around "apartment"/"flat" showing up in a land/plot search (Tavily's own
  // relevance matching isn't perfect) would otherwise pollute the price-extraction pass with an
  // off-type figure -- seen in testing: an apartment-rates page's number got averaged in
  // alongside genuine land-rate figures for the same locality. Gemini still gets the FULL
  // unfiltered text (its own judgment on relevance is better than a keyword filter), only the
  // independent numeric extraction pass excludes clearly mismatched-type sources.
  const offType = (title: string) => {
    const t = title.toLowerCase();
    if (isLandQuery) return /apartment|flat|villa\s+for|multistorey/.test(t);
    return /\bland\b|\bplot(s)?\b/.test(t);
  };
  let snippetsOnly = "";
  if (Array.isArray(data.results)) {
    // 900 chars (was 450) -- the price-extraction pass below needs the fuller snippet to have
    // a real chance of finding a "₹X per sqft/sqyard" style mention; too short and the
    // sentence containing the actual rate gets truncated away before it can be parsed.
    snippetsOnly = data.results
      .slice(0, 6)
      .filter((r) => r.content?.trim())
      .map((r, i) => {
        sourceUrls.push(r.url);
        const block = `[${i + 1}] ${r.title}\n${r.content.slice(0, 900).trim()}`;
        if (!offType(r.title ?? "")) extractionParts.push(block);
        return block;
      })
      .join("\n\n");
    if (snippetsOnly) parts.push(`WEB LISTING SNIPPETS:\n${snippetsOnly}`);
  }

  const combined = parts.join("\n\n");
  // A bare length check let through content that says NOTHING about price (e.g. a locality's
  // general description, connectivity, or amenities) as long as it happened to be over 60
  // characters -- at which point Gemini had nothing real to extract. Requiring an actual
  // price-shaped token (currency symbol, "Cr"/"Lakh"/"L", or "/sqft" etc. next to digits) means
  // "hasData" only fires when there's something genuinely extractable.
  //
  // Checked against snippetsOnly (the actual source pages), never against data.answer: Tavily's
  // own answer-summary is itself a generated paraphrase, and when the real sources found nothing
  // price-bearing (a locality overview / municipality / Wikipedia page, no listings), that
  // summary has been observed inventing a plausible-looking price out of nowhere -- e.g. quoting
  // "₹1,500-₹2,000 per square yard" for a query where not one of the 6 actual source snippets
  // mentions a price at all. Gating on the summary text would let that fabricated figure count
  // as "real data" and get handed to Gemini as if it were grounded. Gating on the source
  // snippets alone means a query that truly returns nothing priced is honestly reported as
  // unavailable instead.
  const hasPriceSignal = /(?:[₹$£€]|Rs\.?|AED|SGD|CAD|A\$|C\$)\s?[\d,]+|[\d,]+\s?(?:\/\s?sq\.?\s?ft|\/\s?sqft|\/\s?sq\.?\s?yd|per\s?sq|Cr\b|Lakh|lac\b)/i;
  return {
    snippets: combined,
    hasData: snippetsOnly.length > 60 && hasPriceSignal.test(snippetsOnly),
    sourceUrls,
    rawText: combined,
    extractionText: extractionParts.join("\n\n"),
  };
}

// ─── Grounded price extraction from real search text ─────────────────────────
// Parses actual currency-amount + per-unit-area mentions directly out of the raw Tavily text,
// independent of Gemini entirely. This is what makes "search-derived" a real, checkable claim
// instead of just trusting an LLM's paraphrase of the same text -- see the GROUNDING RULE in
// normalise() below, which uses this to catch/override a Gemini answer that drifted from what
// the sources actually say. Every matched rate is normalised to per-sqft immediately (see
// UNIT_TO_SQFT above) specifically so a sqft-denominated mention and a sqyard-denominated
// mention from two different sources are never averaged together as if they were the same unit.

const CURRENCY_TOKEN = String.raw`(?:₹|Rs\.?|INR|AED|£|GBP|\$|USD|S\$|SGD|A\$|AUD|CA\$|CAD)`;
const AMOUNT_TOKEN    = String.raw`([\d,]+(?:\.\d+)?)`;
// crore/lakh cover Indian sources; million/thousand (and their K/M abbreviations) cover
// UK/US/SG/AU/CA sources -- without these, "$1.5k" (a Realtor.com "median price per sq.ft"
// mention, meaning $1,500) was read as literally $1.5 with no scale at all, producing a garbage
// ~$2/sqft "rate" that silently dragged a real aggregate's median down by 2x. Longer/more
// specific words are listed before their single-letter abbreviations so the alternation consumes
// the whole word ("million") rather than stopping at a prefix that happens to also be valid ("m").
// The single-letter forms (m/k/l) each carry a negative lookahead against a following letter --
// without it, "$500 more" would let bare "m" match as a million-scale marker off the front of an
// unrelated word. That guard isn't needed on the multi-letter words: if one of them partially
// matches into an unrelated word, the pattern's other required parts (a unit token immediately
// after for the amount-first patterns) fail to line up and the whole match attempt is rejected.
const SCALE_TOKEN     = String.raw`\s?(crore|cr\.?|lakh|lac|million|thousand|mil|mn|m\.?(?!\w)|l(?!\w)|k(?!\w))?`;
const UNIT_TOKEN      = String.raw`(sq\.?\s?ft\.?|sqft\.?|sq\.?\s?yd\.?|sq\s?yard|sqyard|sqyd|gaj|sq\.?\s?m\.?|sqm|square\s?met(?:er|re)|acres?|cents?|guntha|ankanam|ground)`;
const RANGE_SEP        = String.raw`\s*(?:-|–|to|and)\s*`;

// Two orderings, both common in real listing/trend-page prose:
//   amount-first: "₹13,150-23,350 per sq ft"          (AMOUNT [-AMOUNT] per UNIT)
//   unit-first:   "price per sqft is Rs. 34,901"       (per UNIT ... AMOUNT [-AMOUNT])
// The unit-first gap is capped at 80 chars and forbidden from crossing a sentence boundary
// ([^.]) so it still finds the number that actually belongs to that unit mention rather than
// accidentally pairing across unrelated sentences.
const RANGE_RE             = new RegExp(`${CURRENCY_TOKEN}\\s?${AMOUNT_TOKEN}${SCALE_TOKEN}${RANGE_SEP}${CURRENCY_TOKEN}?\\s?${AMOUNT_TOKEN}${SCALE_TOKEN}\\s*(?:\\/|per)\\s*${UNIT_TOKEN}`, "gi");
const SINGLE_RE             = new RegExp(`${CURRENCY_TOKEN}\\s?${AMOUNT_TOKEN}${SCALE_TOKEN}\\s*(?:\\/|per)\\s*${UNIT_TOKEN}`, "gi");
const UNIT_FIRST_RANGE_RE  = new RegExp(`\\bper\\s*${UNIT_TOKEN}\\b[^.]{0,80}?${CURRENCY_TOKEN}\\s?${AMOUNT_TOKEN}${SCALE_TOKEN}${RANGE_SEP}${CURRENCY_TOKEN}?\\s?${AMOUNT_TOKEN}${SCALE_TOKEN}`, "gi");
const UNIT_FIRST_SINGLE_RE = new RegExp(`\\bper\\s*${UNIT_TOKEN}\\b[^.]{0,80}?${CURRENCY_TOKEN}\\s?${AMOUNT_TOKEN}${SCALE_TOKEN}`, "gi");

// Third ordering: no explicit "per unit" phrase at all, just a listing's total price next to its
// area -- e.g. "₹2.32 Cr 2 BHK Apartment 1504 sqft". Very common on listing/overview pages that
// state a transaction price and floor area but never spell out a per-sqft rate. The scale word
// (crore/lakh) is mandatory here since an unscaled number in front of "Cr"/"Lakh" phrasing is
// always a home's total price, never a rate -- this keeps the pattern from ever misreading a
// per-unit mention that the earlier patterns already handle. Lowest priority: only ever fills in
// where the other three found nothing to say about that span of text.
const IMPLIED_RATE_RE = new RegExp(
  `${CURRENCY_TOKEN}\\s?(?<amt>[\\d,]+(?:\\.\\d+)?)\\s?(?<scale>crore|cr\\.?|lakh|lac)\\b[^.]{0,50}?(?<area>[\\d,]+(?:\\.\\d+)?)\\s?(?:sq\\.?\\s?-?\\s?ft\\.?|sqft\\.?)`,
  "gi"
);

// Same idea for markets that don't use crore/lakh notation (UK/US/SG/AU/CA portals) -- Rightmove,
// Zoopla, Redfin, Zillow etc. state a listing's total price and floor area side by side with no
// scale word at all, e.g. "£725,000 · 941 sq ft". Since there's no "Cr"/"Lakh" to signal "this is
// a total, not a rate", the amount is instead required to be at least 6 digits (comma+digits
// included) -- long enough that it can only plausibly be a whole-property price, never a
// per-sqft rate, which keeps this from misreading a per-unit mention the earlier patterns
// already own. The gap also excludes ";" as well as "." since these portals commonly separate
// consecutive listings with "· price · area ;" -- without that, a price from one listing could
// get paired with the area of the next.
const IMPLIED_RATE_UNSCALED_RE = new RegExp(
  `${CURRENCY_TOKEN}\\s?(?<amt>[\\d,]{6,})(?!\\s?(?:crore|cr\\.?|lakh|lac))[^.;]{0,55}?(?<area>[\\d,]+(?:\\.\\d+)?)\\s?(?:sq\\.?\\s?-?\\s?ft\\.?|sqft\\.?)`,
  "gi"
);

// Independently classifies which currency a matched substring actually used, so a rate quoted in
// the wrong currency for this location/query (e.g. a USD "luxury international" listing turning
// up in a GBP-market London search) never gets silently averaged in as if it were the expected
// currency -- checked against the full matched text, not the regex's own capture groups, so it
// works uniformly across every pattern above without touching their existing group indices.
// Order matters: the compound symbols (S$/A$/CA$) must be checked before the bare "$"/USD they
// contain as a substring.
function currencyKeyOf(text: string): string | null {
  if (/₹|Rs\.?|INR/i.test(text)) return "INR";
  if (/AED/i.test(text)) return "AED";
  if (/£|GBP/i.test(text)) return "GBP";
  if (/S\$|SGD/i.test(text)) return "SGD";
  if (/A\$|AUD/i.test(text)) return "AUD";
  if (/CA\$|CAD/i.test(text)) return "CAD";
  if (/\$|USD/i.test(text)) return "USD";
  return null;
}

function expectedCurrencyKey(currencyCode: string): string | null {
  return ["INR", "AED", "GBP", "USD", "SGD", "AUD", "CAD"].includes(currencyCode) ? currencyCode : null;
}

function unitWordToKey(word: string): string | null {
  const w = word.toLowerCase().replace(/\s+/g, "");
  if (/^sq\.?ft\.?$/.test(w)) return "sqft";
  if (/^sq\.?y(a?)rd\.?$/.test(w) || w === "sqyd" || w === "gaj") return "sqyard";
  if (/^sq\.?m\.?$/.test(w) || w === "sqm" || w.startsWith("squaremet")) return "sqm";
  if (w.startsWith("acre")) return "acre";
  if (w.startsWith("cent")) return "cent";
  if (w === "guntha") return "guntha";
  if (w === "ankanam") return "ankanam";
  if (w === "ground") return "ground";
  return null;
}

function scaleMultiplier(scale?: string): number {
  if (!scale) return 1;
  const s = scale.toLowerCase();
  if (s.startsWith("cr")) return 1e7;   // crore
  if (s.startsWith("l"))  return 1e5;   // lakh / lac / l
  if (s.startsWith("m"))  return 1e6;   // million / mil / mn / m
  if (s.startsWith("k") || s.startsWith("th")) return 1e3; // k / thousand
  return 1;
}

function toNumber(amount: string, scale?: string): number {
  const n = parseFloat(amount.replace(/,/g, ""));
  return isNaN(n) ? 0 : n * scaleMultiplier(scale);
}

function spansOverlap(spans: [number, number][], start: number, end: number): boolean {
  return spans.some(([s, e]) => start < e && end > s);
}

// Returns every rate mention found in the text, normalised to price-per-sqft. Runs both
// amount-first and unit-first patterns (ranges before singles, amount-first before unit-first)
// tracking consumed character spans across ALL patterns so the same mention is never counted
// twice regardless of which pattern matched it first. `expectedCurrencyCode` restricts matches to
// the currency this location/query is actually denominated in -- e.g. a stray USD "luxury
// international" listing showing up in a GBP-market London search is dropped rather than
// silently averaged in as if $ and £ were interchangeable. If the location's currency isn't one
// CURRENCY_TOKEN can recognise at all, there is no safe match to make, so this returns nothing
// rather than guessing.
function extractRatesPerSqft(text: string, expectedCurrencyCode: string): number[] {
  const rates: number[] = [];
  const consumed: [number, number][] = [];
  const expectedKey = expectedCurrencyKey(expectedCurrencyCode);
  if (!expectedKey) return rates;

  const collectRange = (re: RegExp, unitFirst: boolean) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const full = m[0];
      const start = m.index, end = start + full.length;
      if (spansOverlap(consumed, start, end)) continue;
      consumed.push([start, end]);
      if (currencyKeyOf(full) !== expectedKey) continue;
      const [unitWord, n1, s1, n2, s2] = unitFirst
        ? [m[1], m[2], m[3], m[4], m[5]]
        : [m[5], m[1], m[2], m[3], m[4]];
      const unitKey = unitWordToKey(unitWord);
      const toSqft = unitKey ? UNIT_TO_SQFT[unitKey] : undefined;
      if (toSqft) {
        const v1 = toNumber(n1, s1);
        const v2 = toNumber(n2, s2);
        if (v1 > 0) rates.push(v1 / toSqft);
        if (v2 > 0) rates.push(v2 / toSqft);
      }
    }
  };

  const collectSingle = (re: RegExp, unitFirst: boolean) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const full = m[0];
      const start = m.index, end = start + full.length;
      if (spansOverlap(consumed, start, end)) continue;
      consumed.push([start, end]);
      if (currencyKeyOf(full) !== expectedKey) continue;
      const [unitWord, amount, scale] = unitFirst ? [m[1], m[2], m[3]] : [m[3], m[1], m[2]];
      const unitKey = unitWordToKey(unitWord);
      const toSqft = unitKey ? UNIT_TO_SQFT[unitKey] : undefined;
      if (!toSqft) continue;
      const v = toNumber(amount, scale);
      if (v > 0) rates.push(v / toSqft);
    }
  };

  const collectImplied = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const full = m[0];
      const start = m.index, end = start + full.length;
      if (spansOverlap(consumed, start, end)) continue;
      consumed.push([start, end]);
      if (currencyKeyOf(full) !== expectedKey) continue;
      const g = m.groups!;
      const total = toNumber(g.amt, g.scale);
      const area = parseFloat(g.area.replace(/,/g, ""));
      if (total > 0 && area > 0) {
        const rate = total / area;
        // Same "reject only if absurd" bar as everywhere else -- not a plausibility band tuned
        // to any particular location, just a guard against a badly mismatched price/area pair.
        if (rate >= 1 && rate <= 10_000_000) rates.push(rate);
      }
    }
  };

  collectRange(RANGE_RE, false);
  collectRange(UNIT_FIRST_RANGE_RE, true);
  collectSingle(SINGLE_RE, false);
  collectSingle(UNIT_FIRST_SINGLE_RE, true);
  collectImplied(IMPLIED_RATE_RE);
  collectImplied(IMPLIED_RATE_UNSCALED_RE);

  return rates;
}

interface SearchAggregate { min: number; median: number; max: number; count: number; }

// Filters extreme outliers only once there's enough of a sample to do so safely (so one stray
// "starting from" teaser or an unrelated total-price mismatch can't dominate a 2-3 value pool),
// then returns the real, source-derived range -- still in per-sqft terms; the caller converts
// to whatever unit the request actually asked for.
function aggregateRates(ratesPerSqft: number[]): SearchAggregate | null {
  if (ratesPerSqft.length === 0) return null;
  const sorted = [...ratesPerSqft].sort((a, b) => a - b);
  let trimmed = sorted;
  if (sorted.length >= 5) {
    const cut = Math.max(1, Math.floor(sorted.length * 0.1));
    trimmed = sorted.slice(cut, sorted.length - cut);
  }
  const mid = Math.floor(trimmed.length / 2);
  const median = trimmed.length % 2 ? trimmed[mid] : (trimmed[mid - 1] + trimmed[mid]) / 2;
  return { min: trimmed[0], median, max: trimmed[trimmed.length - 1], count: sorted.length };
}

// ─── Gemini prompt ────────────────────────────────────────────────────────────
// No hardcoded per-locality price tables here anymore -- Gemini is instructed to extract
// strictly from the live search data injected below (realSection), which is the only pricing
// input it's given. getPrompt() is only ever called once real search data has already been
// confirmed to exist (see the POST handler's `if (dataType === "none")` early-return), so
// there is never a scenario where this needs a numeric fallback to lean on.
function getPrompt(
  location:      string,
  propertyType:  string,
  unit:          string,
  currency:      CurrencyInfo,
  countryCode:   string,
  realDataBlock: string,
  dataType:      "bayut" | "tavily",
  bayutPricePsf?: number
): string {
  const now = new Date();
  const y   = now.getFullYear();
  const unitLabel = unit === "sqyard" ? "sq.yard" : unit === "acres" ? "acre" : "sq.ft";
  const unitKey   = unit === "sqyard" ? "sqyard"  : unit === "acres" ? "acres" : "sqft";

  const [y1, y2, y3, y4, y5] = [y-4, y-3, y-2, y-1, y];
  const [f1, f2, f3, f4, f5] = [y+1, y+2, y+3, y+4, y+5];

  const realSection = `
═══════════════════════════════════════
${dataType === "bayut" ? "LIVE BAYUT.COM LISTING DATA (ONLY SOURCE — DO NOT USE ANY OTHER PRICE)" : "LIVE WEB SEARCH RESULTS (ONLY SOURCE — DO NOT USE ANY OTHER PRICE)"}
═══════════════════════════════════════
${realDataBlock}

${dataType === "bayut" && bayutPricePsf
  ? `CRITICAL: The computed median price-per-sqft from Bayut listings is ${currency.symbol}${bayutPricePsf.toLocaleString()}/sqft.
Your "currentPricePerSqft" MUST be ${bayutPricePsf} (the exact Bayut median). Do NOT invent a different figure.`
  : `Extract the PREVAILING/TYPICAL price-per-${unitLabel} for THIS EXACT locality: "${location}" from the data above and ONLY from the data above.
⚠️ DO NOT use promotional "starting from ₹X" or "from ₹X onwards" teaser prices — those describe the cheapest/smallest unit in one specific project, not the typical rate for the area. Use the median or typical rate implied across the listings/snippets, not the lowest number you see.
⚠️ You have NO other source of truth for this price. Do not supplement, correct, or override the figures above with anything from your own training data — your training data is not current and is not locality-specific enough to be trusted over live search results.`}
═══════════════════════════════════════
`;

  return `You are a real estate data analyst. Extract market intelligence for the SPECIFIC locality: "${location}" (${propertyType} properties) STRICTLY from the live search data provided below. You are not being asked for your own knowledge of this market — you are being asked to read and summarise the data given to you.

COUNTRY: ${countryCode.toUpperCase()} | CURRENCY: ${currency.code} (${currency.symbol}) | UNIT: per ${unitLabel}

${realSection}

⚠️ UNIT DISCIPLINE (MOST IMPORTANT — this is a common source of ~2x errors): the source text may
state prices per sq.ft, per sq.yard, per acre, or in Indian lakh/crore notation. Before using any
figure, identify EXACTLY what unit and scale it was stated in, and convert it correctly to
${currency.code} per ${unitLabel} (1 sq.yard = 9 sq.ft; 1 acre = 4,840 sq.yard = 43,560 sq.ft; 1
lakh = 100,000; 1 crore = 10,000,000). NEVER mix a per-sq.ft figure and a per-sq.yard figure
together as if they were the same unit.

⚠️ TYPE AWARENESS: this request is specifically for "${propertyType}". If the source data
distinguishes property types, use the type-specific figure. Villas/independent houses typically
command a genuine per-sqft premium over apartments in the same micro-market (more private land,
lower density) — if the data doesn't clearly separate them, still make sure your answer reflects
that real-world premium rather than silently reusing an apartment-level rate for a villa.

⚠️ Every locality is priced independently from what's actually in the data above for THAT
locality — never substitute a different area's figure or a generic city-wide average.

CRITICAL RULES:
1. "currency" MUST be "${currency.code}" and "currencySymbol" MUST be "${currency.symbol}" — never use a different currency.
2. "currentPricePerSqft" = price per ${unitLabel} for the SPECIFIC locality "${location}", extracted from the data above${dataType === "bayut" && bayutPricePsf ? ` = EXACTLY ${bayutPricePsf} (from Bayut data)` : ""}.
3. "pricePerSqftUnit" MUST be "${unitKey}".
4. History values must show realistic growth leading up to "currentPricePerSqft". Forecast must show projected growth. These two series are inherently an AI-generated illustrative trend line, not verified historical records — make the trajectory plausible and consistent with "trend"/"growthRate", but do not claim precision you don't have.
5. History and forecast values must be in ${currency.code}, consistent with "currentPricePerSqft".
6. "trend" must be one of: "Bullish", "Stable", or "Cautious".
7. "summary" must mention the SPECIFIC locality "${location}" by name, not just the city, and should be grounded in what the source data actually says.
8. "priceRangeMin"/"priceRangeMax" = the low–high range actually implied by the source data for this locality (not a generic city range) — if the source data shows a wide spread, reflect that honestly rather than narrowing it.
9. "typicalListings" = one short phrase on the kind of properties actually available here right now, based on the source data (e.g. "Mostly 2-3BHK gated-community apartments from mid-size and large developers" or "Primarily HMDA/DTCP-approved open plots in developing layouts") — describe TYPES/segments, never name specific builders or projects.
10. "rangeIsWide" = true if the source data's low-high spread is large relative to the typical price (e.g. high is more than ~1.6x the low) — pocket/plot-size/approval-status variance within one named locality can be genuinely large; say so honestly instead of picking a falsely narrow number.

Return ONLY a valid JSON object — no markdown, no code fences, no explanations:

{
  "locationName": "Full area name, City, Country",
  "currency": "${currency.code}",
  "currencySymbol": "${currency.symbol}",
  "currentPricePerSqft": <number — price per ${unitLabel} in ${currency.code} for "${location}" specifically, from the source data>,
  "priceRangeMin": <number — low end of the range actually implied by the source data>,
  "priceRangeMax": <number — high end of the range actually implied by the source data>,
  "pricePerSqftUnit": "${unitKey}",
  "rangeIsWide": <true | false>,
  "typicalListings": "short phrase describing typical property types/segments available in this exact locality, based on the source data",
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
  "summary": "2–3 sentences of analysis specific to ${location} (mention the locality by name), grounded in the source data",
  "keyDrivers": ["driver1", "driver2", "driver3", "driver4"]
}

Return ONLY the JSON object. No other text.`;
}

// ─── Unavailable state ─────────────────────────────────────────────────────────
// Live, search-grounded data is the ONLY source ever shown to users as a price — there is no
// hardcoded-table fallback estimate. Whenever live data can't be produced for any reason (no
// live listings found, Gemini quota/auth/network failure, malformed response, etc.), this
// returns a simple, honest "unavailable" result instead of a number that could be mistaken for
// something real. The technical reason is logged server-side for debugging; the user only ever
// sees one plain, friendly message with a retry option.
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

// Builds the two 5-year series when Gemini didn't return usable ones — same illustrative-trend
// math as before, unrelated to the hardcoded-benchmark removal (these were never area-specific
// preset tables, just a growth-rate projection off whatever the real current price turned out
// to be).
function buildTrendSeries(now: number, growthRatePct: number, y: number) {
  const rate = growthRatePct / 100;
  const hist = [y-4, y-3, y-2, y-1, y].map((yr, i) => ({
    year: yr, value: Math.round(now / Math.pow(1 + rate, 4 - i)),
  }));
  const fore = [1, 2, 3, 4, 5].map((n) => ({
    year: y + n, value: Math.round(now * Math.pow(1 + rate, n)),
  }));
  return { hist, fore };
}

function normalise(
  raw: Record<string, unknown>,
  location: string,
  propertyType: string,
  unit: string,
  dataSource: DataSource,
  dataSourceLabel: string,
  currency: CurrencyInfo,
  bayutPricePsf?: number,
  bayutRange?: { min: number; max: number },
  searchAgg?: SearchAggregate | null,
  sourceUrls?: string[]
): Record<string, unknown> {
  const y = new Date().getFullYear();
  const geminiPrice = Number(raw.currentPricePerSqft) || 0;
  const factor = targetUnitFactor(propertyType, unit); // per-sqft -> requested unit

  let now: number;
  let range: { min: number; max: number };
  let groundedBy: "bayut" | "search_data" | "gemini";

  if (dataSource === "bayut_data" && bayutPricePsf) {
    // Bayut's own median is already computed directly from real live listing price/area
    // fields -- the most authoritative source available, never second-guessed.
    now = bayutPricePsf;
    range = bayutRange ?? { min: Math.round(now * 0.85), max: Math.round(now * 1.25) };
    groundedBy = "bayut";
  } else if (searchAgg && searchAgg.count >= 2) {
    // GROUNDING RULE: checked against the search-derived MEDIAN, not the raw min/max -- real
    // estate aggregator pages disagree with each other a lot, and a single source's internally
    // inconsistent "average" (seen in testing: one portal's self-reported plot average sat 3x
    // above every other source's cluster for the same locality) can blow the raw max out to
    // something absurd even though the median stays sane. If Gemini's own number is reasonably
    // close to the median, keep Gemini's number (it may have picked a more representative point
    // than a raw median, e.g. correctly discounting a "starting from" teaser). If Gemini's
    // number is genuinely inconsistent, DISCARD it and use the search-derived median instead --
    // Gemini's training data is stale on prices; the sources it was just given are not.
    const searchMin    = Math.round(searchAgg.min    * factor);
    const searchMedian = Math.round(searchAgg.median * factor);
    const searchMax    = Math.round(searchAgg.max    * factor);
    const geminiConsistent = geminiPrice > 0 && geminiPrice >= searchMedian * 0.55 && geminiPrice <= searchMedian * 1.8;

    if (geminiConsistent) {
      now = geminiPrice;
      groundedBy = "gemini";
    } else {
      now = searchMedian;
      groundedBy = "search_data";
      console.warn(`[market-intel] GROUNDING OVERRIDE for "${location}" (${propertyType}, ${unit}): Gemini said ${geminiPrice}, search-derived median is ${searchMedian} (raw parsed range ${searchMin}-${searchMax}) — using search-derived median.`);
    }
    // The displayed range comes from real sources, but the same single-outlier-source problem
    // can blow the raw min/max out to something that would look broken on screen even after
    // the point price itself is sane -- cap it to a sane multiple of the median. Still shows an
    // honestly wide range when sources genuinely disagree moderately, just not a 3x-outlier one.
    const rangeMin = Math.min(Math.max(searchMin, Math.round(searchMedian * 0.4)), now);
    const rangeMax = Math.max(Math.min(searchMax, Math.round(searchMedian * 2.2)), now);
    range = { min: rangeMin, max: rangeMax };
  } else {
    // No independently-parseable rate mentions in the search text (real prose without a clean
    // "₹X per sqft" pattern is common) -- there's nothing to check Gemini's number against, so
    // trust its extraction (Tavily already confirmed genuine price-shaped content exists via
    // hasPriceSignal before Gemini was ever called). The only remaining guard is an absurdity
    // check: reject non-positive numbers or self-inconsistent ranges, never pull toward a preset.
    now = geminiPrice > 0 ? geminiPrice : 0;
    groundedBy = "gemini";
    const rawMin = Number(raw.priceRangeMin);
    const rawMax = Number(raw.priceRangeMax);
    const geminiRangeOk = rawMin > 0 && rawMax > rawMin && now >= rawMin * 0.5 && now <= rawMax * 1.5;
    range = geminiRangeOk
      ? { min: Math.round(rawMin), max: Math.round(rawMax) }
      : { min: Math.round(now * 0.85), max: Math.round(now * 1.25) };
  }

  if (now <= 0) {
    throw new Error("no usable price could be derived from either the search data or Gemini's response");
  }

  const rate = (Number(raw.growthRate) || 8);
  let hist = raw.priceHistory5yr as { year: number; value: number }[] | undefined;
  let fore = raw.priceForecast5yr as { year: number; value: number }[] | undefined;
  if (!Array.isArray(hist) || hist.length < 2 || !Array.isArray(fore) || fore.length < 2) {
    const built = buildTrendSeries(now, rate, y);
    hist = Array.isArray(hist) && hist.length >= 2 ? hist : built.hist;
    fore = Array.isArray(fore) && fore.length >= 2 ? fore : built.fore;
  }

  const trend = ["Bullish", "Stable", "Cautious"].includes(raw.trend as string)
    ? (raw.trend as string) : "Stable";

  // "Prices vary significantly..." note -- shown whenever the range is genuinely wide, whether
  // Gemini flagged rangeIsWide itself or the search-derived spread implies it independently.
  const isWide = raw.rangeIsWide === true || range.max > range.min * 1.6;
  const rangeNote = isWide
    ? "Prices vary significantly by pocket, plot size and approvals — verify the specific property."
    : undefined;

  return {
    available:           true,
    locationName:        (raw.locationName    as string) || location,
    currency:            currency.code,                   // enforced from detection
    currencySymbol:      currency.symbol,                 // enforced from detection
    currentPricePerSqft: now,
    priceRangeMin:       range.min,
    priceRangeMax:       range.max,
    rangeNote,
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
    groundedBy,
    sourceUrls:          sourceUrls?.slice(0, 5) ?? [],
    summary:             (raw.summary as string) || `${location} shows stable market dynamics.`,
    keyDrivers:          Array.isArray(raw.keyDrivers) ? raw.keyDrivers : ["Strong demand", "Good connectivity", "Infrastructure growth", "Growing employment"],
  };
}

class GeminiQuotaError extends Error {}

async function callGemini(apiKey: string, prompt: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
// Shared across every caller of computeMarketIntel() (single-type endpoint, overview endpoint)
// so a location+type looked up via either path benefits the other for the next 5 minutes.

interface CacheEntry { data: Record<string, unknown>; ts: number; }
const RESULT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getCached(key: string): Record<string, unknown> | null {
  const entry = RESULT_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { RESULT_CACHE.delete(key); return null; }
  return entry.data;
}

export function setCache(key: string, data: Record<string, unknown>) {
  // Keep cache bounded
  if (RESULT_CACHE.size > 100) {
    let oldestKey = "";
    let oldestTs  = Infinity;
    RESULT_CACHE.forEach((v, k) => { if (v.ts < oldestTs) { oldestTs = v.ts; oldestKey = k; } });
    if (oldestKey) RESULT_CACHE.delete(oldestKey);
  }
  RESULT_CACHE.set(key, { data, ts: Date.now() });
}

// ─── Shared core: one (location, propertyType, unit) -> normalised result ──────
// Both the single-type endpoint (app/api/market-intel/route.ts) AND the multi-type overview
// endpoint (app/api/market-intel/overview/route.ts) and the hot-market refresh cron
// (app/api/cron/refresh-hot-markets/route.ts) call through this exact same code path -- no
// duplicated pricing/grounding logic anywhere. Returns either the normalised result (same shape
// every caller has always returned) or an unavailableResponse() object; never throws for the
// "no data"/"Gemini failed" cases, only for genuinely unexpected errors during normalise()
// (caught the same way every caller already does).
export async function computeMarketIntel(
  loc: string,
  propType: string,
  resolvedUnit: string
): Promise<Record<string, unknown>> {
  const geminiKey   = process.env.GEMINI_API_KEY;
  const tavilyKey   = process.env.TAVILY_API_KEY;
  const rapidApiKey = process.env.RAPIDAPI_KEY;

  // ── Step 0: Detect country + currency ────────────────────────────────────
  const { countryCode, currency } = await detectCurrency(loc);

  if (!geminiKey) {
    return unavailableResponse("no GEMINI_API_KEY configured");
  }

  // ── Step 1: Real data — Bayut (UAE) or Tavily (elsewhere) ────────────────
  let realDataBlock:   string | null = null;
  let dataSource:      DataSource    = "ai_only";
  let dataSourceLabel: string        = "";
  let bayutPricePsf:   number | undefined;
  let bayutRange:      { min: number; max: number } | undefined;
  let dataType:        "bayut" | "tavily" | "none" = "none";
  let searchAgg:       SearchAggregate | null = null;
  let sourceUrls:      string[] = [];

  if (countryCode === "ae" && rapidApiKey) {
    // ── Bayut for UAE ───────────────────────────────────────────────────────
    try {
      const bayutResult = await fetchBayutData(loc, propType, rapidApiKey);
      if (bayutResult && bayutResult.count >= 2) {
        realDataBlock  = bayutResult.snippets;
        dataSource     = "bayut_data";
        dataSourceLabel = `AI-analyzed from ${bayutResult.count} live Bayut listings`;
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
        // Not "current web listings" -- what's actually found here is usually SEO/aggregator
        // locality-estimate pages (99acres/MagicBricks/Housing.com "average price in X" style
        // content), not individual live-for-sale listings. "AI estimate based on live web
        // search" is accurate to both halves of that: genuinely grounded in a live search (not
        // fabricated from training data alone), but a synthesis, not a literal listing price.
        dataSourceLabel = "AI estimate based on live web search";
        dataType       = "tavily";
        sourceUrls     = tavilyResult.sourceUrls;
        searchAgg      = aggregateRates(extractRatesPerSqft(tavilyResult.extractionText || tavilyResult.rawText, currency.code));
        console.log(`[Tavily] got data for "${loc}"${searchAgg ? ` — parsed ${searchAgg.count} rate mention(s), per-sqft median ${Math.round(searchAgg.median)}` : " — no cleanly-parseable rate mentions, will trust Gemini's extraction"}`);
      } else {
        console.warn(`[Tavily] no/slow data for "${loc}"`);
      }
    } catch (e) {
      console.warn("[Tavily] fetch failed (non-fatal):", e);
    }
  }

  // Live, search-grounded data is the only source ever shown to users — if neither Bayut nor
  // Tavily found real listing data, there's nothing for Gemini to ground an answer in, so
  // there's no point spending an API call (and quota) on a result we'd discard anyway. Not
  // cached: a moment later this same query might succeed once live data is available.
  if (dataType === "none" || !realDataBlock) {
    return unavailableResponse(`no live listing data found for "${loc}" (${propType})`);
  }

  // ── Step 2: Build Gemini prompt ──────────────────────────────────────────
  const prompt = getPrompt(loc, propType, resolvedUnit, currency, countryCode, realDataBlock, dataType, bayutPricePsf);

  // ── Step 3: Call Gemini — primary model, retry, then fallback model on quota exhaustion ──
  // A quota error means retrying the SAME model is pointless, but the fallback model has its
  // own separate daily quota bucket and can genuinely still succeed where the primary can't.
  // Plan: primary attempt -> (if quota-exhausted) fallback attempt, done.
  //       primary attempt -> (if a transient non-quota error) retry primary once -> (if that
  //       also hits quota) fallback attempt, done.
  async function attemptGemini(model: string): Promise<Record<string, unknown>> {
    return parseGemini(await callGemini(geminiKey!, prompt, model));
  }

  let raw: Record<string, unknown> | undefined;
  let lastError: unknown;
  try {
    raw = await attemptGemini(GEMINI_MODEL_PRIMARY);
  } catch (e1) {
    console.error(`Gemini ${GEMINI_MODEL_PRIMARY} attempt 1 failed:`, e1);
    lastError = e1;
    if (!(e1 instanceof GeminiQuotaError)) {
      // Transient (network/parse/etc.) failure — worth one same-model retry.
      try {
        raw = await attemptGemini(GEMINI_MODEL_PRIMARY);
        lastError = undefined;
      } catch (e2) {
        console.error(`Gemini ${GEMINI_MODEL_PRIMARY} attempt 2 failed:`, e2);
        lastError = e2;
      }
    }
    if (!raw && lastError instanceof GeminiQuotaError) {
      try {
        raw = await attemptGemini(GEMINI_MODEL_FALLBACK);
        lastError = undefined;
      } catch (e3) {
        console.error(`Gemini fallback ${GEMINI_MODEL_FALLBACK} also failed:`, e3);
        lastError = e3;
      }
    }
  }

  if (!raw) {
    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    const isQuota = lastError instanceof GeminiQuotaError;
    return unavailableResponse(
      isQuota ? `Gemini quota exhausted on all models for "${loc}": ${reason}` : `Gemini call failed for "${loc}": ${reason}`
    );
  }

  try {
    const result = normalise(raw!, loc, propType, resolvedUnit, dataSource, dataSourceLabel, currency, bayutPricePsf, bayutRange, searchAgg, sourceUrls);
    console.log(`[market-intel] RESULT: "${loc}" (${propType}) → ${currency.code} ${result.currentPricePerSqft}/${resolvedUnit} (source: ${dataSource}, grounded by: ${result.groundedBy})`);
    return result;
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return unavailableResponse(`failed to process AI response for "${loc}": ${reason}`);
  }
}
