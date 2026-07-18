"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bot, TrendingUp, AlertCircle, Loader2, Search,
  Calculator, MapPin, Star, Activity, ChevronDown,
  CheckCircle, ArrowUpRight, MessageCircle, Globe,
} from "lucide-react";
import LeadForm from "@/components/ui/LeadForm";
import UnitConverter from "@/components/ui/UnitConverter";
import { useCurrency } from "@/components/ui/CurrencyToggle";
import { CURRENCY_MAP, convertPrice, toINR, type CurrencyCode } from "@/lib/currency";
import AiIntelRegisterGate from "@/components/ui/AiIntelRegisterGate";

// ─── Constants ─────────────────────────────────────────────────────────────────
// Split into city + area so a chip click fills both levels of the two-field search
// correctly, instead of dumping a combined string into one field.
const HOT_MARKETS: { city: string; area: string }[] = [
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

const PROPERTY_TYPES = [
  { value: "apartment",   label: "Apartment",               defaultUnit: "sqft"   },
  { value: "villa",       label: "Villa",                   defaultUnit: "sqft"   },
  { value: "house",       label: "Independent House",       defaultUnit: "sqft"   },
  { value: "commercial",  label: "Commercial / Office",     defaultUnit: "sqft"   },
  { value: "plot",        label: "Plot / Residential Land", defaultUnit: "sqyard" },
  { value: "agriculture", label: "Agriculture / Farm Land", defaultUnit: "acres"  },
];

const LOADING_STEPS = [
  "Searching live web data…",
  "Analysing area trends…",
  "Calculating market estimate…",
];

// Base units always available
const BASE_UNITS = [
  { value: "sqft",   label: "sq.ft"   },
  { value: "sqyard", label: "sq.yard" },
  { value: "sqmeter",label: "sq.m"    },
  { value: "acres",  label: "acres"   },
];


const PLOT_LAND_TYPES = ["plot", "agriculture"];

const UNIT_LABELS: Record<string, string> = {
  sqft:    "Sq.Ft",
  sqyard:  "Sq.Yard",
  sqmeter: "Sq.M",
  acres:   "Acre",
  ankanam: "Ankanam",
  cent:    "Cent",
  guntha:  "Guntha",
  ground:  "Ground",
  bigha:   "Bigha",
  gaz:     "Gaz (Sq.Yard)",
};

// Sqft multiplier for all units
const UNIT_TO_SQFT: Record<string, number> = {
  sqft: 1, sqyard: 9, sqmeter: 10.7639, acres: 43560,
  ankanam: 36, cent: 435.6, guntha: 1089,
  ground: 2400, bigha: 27000, gaz: 9,
};

// Region detection from location string → returns local units for plot/land
function getRegionUnits(location: string): { value: string; label: string; note: string }[] {
  const loc = location.toLowerCase();
  // AP / Telangana
  if (loc.match(/hyderabad|telangana|andhra|vizag|guntur|nellore|vijayawada|tirupati|kakinada/)) {
    return [
      { value: "ankanam", label: "Ankanam",   note: "= 36 sq.ft" },
      { value: "cent",    label: "Cent",       note: "= 435.6 sq.ft" },
      { value: "guntha",  label: "Guntha",     note: "= 1,089 sq.ft" },
    ];
  }
  // Tamil Nadu / Kerala
  if (loc.match(/chennai|coimbatore|madurai|tamil|kerala|thrissur|kochi|trivandrum|calicut/)) {
    return [
      { value: "cent",   label: "Cent",   note: "= 435.6 sq.ft" },
      { value: "ground", label: "Ground", note: "= 2,400 sq.ft" },
    ];
  }
  // Karnataka
  if (loc.match(/bangalore|bengaluru|mysore|karnataka|hubli|mangalore/)) {
    return [
      { value: "guntha", label: "Guntha", note: "= 1,089 sq.ft" },
    ];
  }
  // Maharashtra / Gujarat
  if (loc.match(/mumbai|pune|nagpur|maharashtra|gujarat|surat|ahmedabad/)) {
    return [
      { value: "guntha", label: "Guntha", note: "= 1,089 sq.ft" },
    ];
  }
  // North India
  if (loc.match(/delhi|ncr|gurgaon|noida|faridabad|haryana|punjab|rajasthan|uttar pradesh|up |lucknow|kanpur|jaipur/)) {
    return [
      { value: "gaz",   label: "Gaz (Sq.Yard)", note: "= 9 sq.ft" },
      { value: "bigha", label: "Bigha",          note: "≈ 27,000 sq.ft (varies)" },
    ];
  }
  // International / default — no local units
  return [];
}

// ─── Types ──────────────────────────────────────────────────────────────────────
interface Loc { name: string; hint: string; }

interface MarketIntelResult {
  available?:         boolean;
  locationName:       string;
  currency:           string;
  currencySymbol:     string;
  currentPricePerSqft: number;
  priceRangeMin?:     number;
  priceRangeMax?:     number;
  rangeNote?:         string;
  typicalListings?:   string;
  pricePerSqftUnit:   string;
  priceHistory5yr:    { year: number; value: number }[];
  priceForecast5yr:   { year: number; value: number }[];
  dataSource?:        "bayut_data" | "real_data" | "ai_only";
  dataSourceLabel?:   string;
  groundedBy?:        "bayut" | "search_data" | "gemini";
  sourceUrls?:        string[];
  growthRate:         number;
  trend:              "Bullish" | "Stable" | "Cautious";
  rentalYield:        number;
  investmentRating:   number;
  bestFor:            string;
  summary:            string;
  keyDrivers:         string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtPrice(val: number, sym: string, currency: string): string {
  if (currency === "INR") {
    if (val >= 10_000_000) return `${sym}${(val / 10_000_000).toFixed(2)} Cr`;
    if (val >= 100_000)    return `${sym}${(val / 100_000).toFixed(2)} L`;
    return `${sym}${val.toLocaleString("en-IN")}`;
  }
  if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `${sym}${(val / 1_000).toFixed(1)}K`;
  return `${sym}${val.toLocaleString()}`;
}

function fmtSqft(val: number, sym: string): string {
  if (val >= 10_000) return `${sym}${(val / 1_000).toFixed(0)}K`;
  return `${sym}${val.toLocaleString()}`;
}


function calcEMI(principal: number, annualRate: number, years: number): number {
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 12 / 100;
  const n = years * 12;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// ─── SVG Line Chart ─────────────────────────────────────────────────────────────
function LineChart({
  id, points, formatFn, dashed,
}: {
  id: string;
  points: { year: number; value: number }[];
  formatFn: (v: number) => string;
  dashed?: boolean;
}) {
  if (!points || points.length < 2) return null;
  const vals  = points.map((p) => p.value);
  const minV  = Math.min(...vals);
  const maxV  = Math.max(...vals);
  const pad   = (maxV - minV) * 0.15 || maxV * 0.1;
  const lo    = minV - pad;
  const hi    = maxV + pad;
  const range = hi - lo || 1;
  const W = 380; const H = 155;
  const PL = 10; const PR = 10; const PT = 32; const PB = 32;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const toX = (i: number) => PL + (i / (points.length - 1)) * cW;
  const toY = (v: number) => PT + ((hi - v) / range) * cH;
  // --gold-text (6.2:1 on white) instead of --gold (2.2:1) -- this chart's data-point label
  // (fontSize=9 text below) needs WCAG AA's 4.5:1 minimum; the line/gradient don't strictly,
  // but share this constant for one consistent chart color.
  const GOLD = "#7A5C1A";

  const poly = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ");
  const area =
    `M ${toX(0).toFixed(1)},${toY(points[0].value).toFixed(1)} ` +
    points.slice(1).map((p, i) => `L ${toX(i + 1).toFixed(1)},${toY(p.value).toFixed(1)}`).join(" ") +
    ` L ${toX(points.length - 1).toFixed(1)},${(PT + cH).toFixed(1)} L ${PL},${(PT + cH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={GOLD} stopOpacity="0.25" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PL} x2={W - PR} y1={PT + f * cH} y2={PT + f * cH}
          stroke="#f3f4f6" strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#fill-${id})`} />
      <polyline points={poly} fill="none" stroke={GOLD} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round"
        strokeDasharray={dashed ? "8 4" : undefined} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(p.value)} r={i === 0 || i === points.length - 1 ? 4 : 3}
            fill={GOLD} />
          <text x={toX(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="#9ca3af"
            fontFamily="ui-monospace,monospace">
            {p.year}
          </text>
          {(i === 0 || i === points.length - 1) && (
            <text
              x={toX(i)}
              y={toY(p.value) - 9}
              textAnchor={i === 0 ? "start" : "end"}
              fontSize="9" fill={GOLD}
              fontFamily="ui-monospace,monospace" fontWeight="bold"
            >
              {formatFn(p.value)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─── Trend config ───────────────────────────────────────────────────────────────
const TREND_STYLE: Record<string, { bg: string; border: string; text: string; dot: string; icon: string }> = {
  Bullish:  { bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  dot: "bg-green-500",  icon: "▲" },
  Stable:   { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", dot: "bg-amber-500",  icon: "→" },
  Cautious: { bg: "bg-red-50",    border: "border-red-300",    text: "text-red-700",    dot: "bg-red-500",    icon: "▼" },
};

// ─── Main Component ─────────────────────────────────────────────────────────────
// Wrapped in Suspense below (Next.js requires this around any useSearchParams() usage) --
// renamed to an inner component so the actual default export can provide that boundary.
function AIIntelligenceInner() {
  const searchParams = useSearchParams();
  const { currency: selectedCurrency } = useCurrency();

  // ── Two-level location search: City/Country (Field A) + Area/Locality (Field B) ──
  // Area is scoped to whatever's currently in the City field (via /api/location?city=),
  // and only the exact selected AREA (when present) drives the price -- city-only still
  // works on its own for a city-level estimate.
  const [cityQuery,     setCityQuery]     = useState("");
  const [citySelected,  setCitySelected]  = useState("");
  const [citySuggestions, setCitySuggestions] = useState<Loc[]>([]);
  const [showCityDrop,  setShowCityDrop]  = useState(false);
  const [loadingCityLoc, setLoadingCityLoc] = useState(false);

  const [areaQuery,     setAreaQuery]     = useState("");
  const [areaSelected,  setAreaSelected]  = useState("");
  const [areaSuggestions, setAreaSuggestions] = useState<Loc[]>([]);
  const [showAreaDrop,  setShowAreaDrop]  = useState(false);
  const [loadingAreaLoc, setLoadingAreaLoc] = useState(false);

  const [propType,    setPropType]    = useState("apartment");
  const [area,        setArea]        = useState("1200");
  const [unit,        setUnit]        = useState("sqft");
  const [result,      setResult]      = useState<MarketIntelResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [usage,       setUsage]       = useState<{ used: number; limit: number; remaining: number; loggedIn: boolean; registered?: boolean } | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const [downPct,    setDownPct]    = useState(20);
  const [intRate,    setIntRate]    = useState(8.75);
  const [tenure,     setTenure]     = useState(20);
  const [showEMI,    setShowEMI]    = useState(false);
  const [loadStep,   setLoadStep]   = useState(0);

  const cityDropRef  = useRef<HTMLDivElement>(null);
  const areaDropRef  = useRef<HTMLDivElement>(null);
  const cityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const areaDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const cityValue = (citySelected || cityQuery).trim();
  const areaValue = (areaSelected || areaQuery).trim();

  // ── Nominatim autocomplete — City/Country field ─────────────────────────────
  const fetchCitySuggestions = useCallback(async (q: string) => {
    setLoadingCityLoc(true);
    try {
      const res  = await fetch(`/api/location?q=${encodeURIComponent(q)}`);
      const locs: Loc[] = await res.json();
      setCitySuggestions(locs.slice(0, 8));
      setShowCityDrop(locs.length > 0);
    } catch {
      const fb = HOT_MARKETS
        .filter((m) => m.city.toLowerCase().includes(q.toLowerCase()))
        .map((m) => ({ name: m.city, hint: "Suggested" }));
      setCitySuggestions(fb);
      setShowCityDrop(fb.length > 0);
    } finally {
      setLoadingCityLoc(false);
    }
  }, []);

  const handleCityQuery = (val: string) => {
    setCityQuery(val);
    setCitySelected("");
    // Changing the city invalidates whatever area was picked for the previous city.
    setAreaQuery(""); setAreaSelected("");
    if (!val.trim() || val.length < 2) { setCitySuggestions([]); setShowCityDrop(false); return; }
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    cityDebounceRef.current = setTimeout(() => fetchCitySuggestions(val), 350);
  };

  const pickCity = (loc: Loc) => {
    setCityQuery(`${loc.name}${loc.hint ? ` · ${loc.hint}` : ""}`);
    setCitySelected(loc.name);
    setShowCityDrop(false);
    setCitySuggestions([]);
  };

  // ── Nominatim autocomplete — Area/Locality field, scoped to the selected city ────
  const fetchAreaSuggestions = useCallback(async (q: string, city: string) => {
    setLoadingAreaLoc(true);
    try {
      const res  = await fetch(`/api/location?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`);
      const locs: Loc[] = await res.json();
      setAreaSuggestions(locs.slice(0, 8));
      setShowAreaDrop(locs.length > 0);
    } catch {
      const fb = HOT_MARKETS
        .filter((m) => m.city.toLowerCase() === city.toLowerCase() && m.area.toLowerCase().includes(q.toLowerCase()))
        .map((m) => ({ name: m.area, hint: "Suggested" }));
      setAreaSuggestions(fb);
      setShowAreaDrop(fb.length > 0);
    } finally {
      setLoadingAreaLoc(false);
    }
  }, []);

  const handleAreaQuery = (val: string) => {
    setAreaQuery(val);
    setAreaSelected("");
    if (!val.trim() || val.length < 2 || !cityValue) { setAreaSuggestions([]); setShowAreaDrop(false); return; }
    if (areaDebounceRef.current) clearTimeout(areaDebounceRef.current);
    areaDebounceRef.current = setTimeout(() => fetchAreaSuggestions(val, cityValue), 350);
  };

  const pickArea = (loc: Loc) => {
    setAreaQuery(loc.name);
    setAreaSelected(loc.name);
    setShowAreaDrop(false);
    setAreaSuggestions([]);
  };

  const pickHotMarket = (m: { city: string; area: string }) => {
    setCityQuery(m.city);   setCitySelected(m.city);
    setAreaQuery(m.area);   setAreaSelected(m.area);
    setShowCityDrop(false); setShowAreaDrop(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityDropRef.current && !cityDropRef.current.contains(e.target as Node)) setShowCityDrop(false);
      if (areaDropRef.current && !areaDropRef.current.contains(e.target as Node)) setShowAreaDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
      if (areaDebounceRef.current) clearTimeout(areaDebounceRef.current);
    };
  }, []);

  // Pre-fill from ?area=&city=, e.g. arriving from the homepage hero's lightweight
  // "Check Any Location's Real Price" input. Reuses the exact same state-setting path
  // pickHotMarket() already uses for a "Popular Markets" chip click -- just sourced from the
  // URL instead of a click. Does not touch fetchMarket, the usage gate, or any pricing logic;
  // the user still presses Analyze themselves to run a real check.
  useEffect(() => {
    const areaParam = searchParams.get("area");
    const cityParam = searchParams.get("city");
    if (cityParam) { setCityQuery(cityParam); setCitySelected(cityParam); }
    if (areaParam) { setAreaQuery(areaParam); setAreaSelected(areaParam); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Analyze ─────────────────────────────────────────────────────────────────
  const analyze = async () => {
    if (!cityValue) { setError("Please enter a city or country to analyze."); return; }
    // The exact selected AREA drives the price when present; city-only still works on its
    // own for a city-level estimate.
    const loc = areaValue ? `${areaValue}, ${cityValue}` : cityValue;
    setLoading(true); setError(""); setResult(null); setShowEMI(false); setLoadStep(0); setLimitReached(false);

    // Progressive loading messages
    const stepTimers = [
      setTimeout(() => setLoadStep(1), 3000),
      setTimeout(() => setLoadStep(2), 6000),
    ];

    // Resolve API unit: local land units → sqyard for the API (Gemini understands sqyard)
    const LOCAL_LAND = ["ankanam", "cent", "guntha", "ground", "bigha", "gaz"];
    const apiUnit = LOCAL_LAND.includes(unit) ? "sqyard" : unit;

    try {
      const res  = await fetch("/api/market-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: loc, propertyType: propType, unit: apiUnit, countUsage: true }),
      });
      const data = await res.json();
      if (res.status === 403 && data.error === "usage_limit") {
        setLimitReached(true);
        setUsage(data);
      } else if (res.ok && !data.error && data.available) {
        setResult(data);
        if (data.usage) setUsage(data.usage);
      } else if (res.ok && data.available === false) {
        // Honest "no fallback estimate" state — live data is the only source now, so a
        // failure here means exactly that, not a stale/generic number pretending otherwise.
        setError(data.message || "Live market data is temporarily unavailable for this area. Please try again in a moment.");
        if (data.usage) setUsage(data.usage);
      } else {
        setError("Live market data is temporarily unavailable for this area. Please try again in a moment.");
      }
    } catch {
      setError("Live market data is temporarily unavailable for this area. Please try again in a moment.");
    } finally {
      stepTimers.forEach(clearTimeout);
      setLoading(false);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const r          = result;
  const curr       = r?.currency       ?? "INR";
  // The API returns the price in the searched location's NATIVE currency (e.g. AED for a
  // Dubai search) — that's a different concern from the header's user-selected DISPLAY
  // currency. Convert native -> INR -> selected display currency whenever the native
  // currency is one we have exchange rates for; otherwise show the native currency as-is
  // (we don't have rates for every currency the API can detect, e.g. JPY/EUR/QAR).
  const isConvertible = (c: string): c is CurrencyCode => c in CURRENCY_MAP;
  const toDisplay = (amountInNativeCurrency: number): number =>
    isConvertible(curr) ? convertPrice(toINR(amountInNativeCurrency, curr), selectedCurrency) : amountInNativeCurrency;
  const sym = isConvertible(curr) ? (CURRENCY_MAP[selectedCurrency]?.symbol ?? "₹") : (r?.currencySymbol ?? "₹");
  const dispCurr = isConvertible(curr) ? selectedCurrency : curr;
  const areaNum    = Number(area) || 0;
  // For local land units, convert to sqyard first (API returns sqyard price for these)
  const LOCAL_UNITS_SET = ["ankanam", "cent", "guntha", "ground", "bigha", "gaz"];
  const isLocalUnit  = LOCAL_UNITS_SET.includes(unit);
  const areaInApiUnit = isLocalUnit && areaNum > 0
    ? (areaNum * (UNIT_TO_SQFT[unit] ?? 1)) / (UNIT_TO_SQFT["sqyard"] ?? 9)
    : areaNum;
  // API always prices local land units (ankanam/cent/guntha/...) per sq.yard — convert the
  // displayed rate (headline price + charts) into the buyer's actually-selected unit so
  // "ankanam" shows a real ₹/ankanam figure instead of the underlying ₹/sq.yard number.
  const unitConvFactor = isLocalUnit ? (UNIT_TO_SQFT[unit] ?? 9) / (UNIT_TO_SQFT["sqyard"] ?? 9) : 1;
  const displayUnitKey   = isLocalUnit ? unit : (r?.pricePerSqftUnit ?? "sqft");
  const displayUnitLabel = UNIT_LABELS[displayUnitKey] ?? displayUnitKey;
  // Convert native currency -> selected display currency (toDisplay) on top of the existing
  // unit conversion (unitConvFactor) — these are independent dimensions (unit vs currency).
  const displayPrice = r ? Math.round(toDisplay(r.currentPricePerSqft * unitConvFactor)) : 0;
  const propValue  = r && areaInApiUnit > 0 ? Math.round(toDisplay(r.currentPricePerSqft * areaInApiUnit)) : 0;
  const loanAmt    = propValue > 0 ? Math.round(propValue * (1 - downPct / 100)) : 0;
  const monthlyEMI = loanAmt  > 0 ? calcEMI(loanAmt, intRate, tenure) : 0;
  const totalPay   = monthlyEMI * tenure * 12;
  const totalInt   = totalPay - loanAmt;

  const fmtFn  = r ? (v: number) => fmtSqft(v, sym) : (v: number) => String(v);
  const trend  = r?.trend ?? "Stable";
  const ts     = TREND_STYLE[trend] ?? TREND_STYLE.Stable;
  const rating = r?.investmentRating ?? 0;
  const ratingColor = rating >= 8 ? "text-green-600" : rating >= 6 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="pt-32 pb-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 border text-xs tracking-widest px-4 py-2 rounded-full mb-4 uppercase font-semibold"
            style={{ borderColor: "rgba(214,166,62,0.4)", color: "var(--gold-text)", background: "rgba(214,166,62,0.08)" }}>
            <Bot size={13} /> AI Market Intelligence
          </div>
          <h1 className="heading-h1 mb-3">
            AI Market Intelligence — Know Any Area&apos;s <span className="gold-text">True Value</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Type any city, area, or neighbourhood worldwide. Get AI-generated market analysis —
            price trends, growth forecasts, rental yield, investment rating — in seconds.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left: Form + Results ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Search card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">

              {/* Two-level location: City/Country + Area/Locality (scoped to the chosen city) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">

                {/* City / Country */}
                <div className="relative" ref={cityDropRef}>
                  <label className="label-dark"><MapPin size={11} className="inline mr-1" style={{ color: "var(--gold-text)" }} />City / Country</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={cityQuery}
                      onChange={(e) => handleCityQuery(e.target.value)}
                      onFocus={() => citySuggestions.length > 0 && setShowCityDrop(true)}
                      placeholder="Dubai, Hyderabad, London…"
                      className="input-dark pl-9 pr-8 text-sm"
                    />
                    {loadingCityLoc && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin pointer-events-none" />}
                  </div>
                  {showCityDrop && citySuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      {citySuggestions.map((s, i) => (
                        <button
                          key={`${s.name}-${i}`}
                          onMouseDown={() => pickCity(s)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(214,166,62,0.08)] transition-colors duration-200 text-left border-b border-gray-100 last:border-0"
                        >
                          <span className="text-gray-900 text-sm">{s.name}</span>
                          <span className="text-gray-400 text-xs">{s.hint}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Area / Locality — scoped to whatever's in the City field above */}
                <div className="relative" ref={areaDropRef}>
                  <label className="label-dark">
                    <MapPin size={11} className="inline mr-1" style={{ color: "var(--gold-text)" }} />
                    Area / Locality <span className="normal-case text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={areaQuery}
                      disabled={!cityValue}
                      onChange={(e) => handleAreaQuery(e.target.value)}
                      onFocus={() => areaSuggestions.length > 0 && setShowAreaDrop(true)}
                      placeholder={cityValue ? "Business Bay, Kokapet, Mayfair…" : "Select a city first"}
                      className="input-dark pl-9 pr-8 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    {loadingAreaLoc && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin pointer-events-none" />}
                  </div>
                  {showAreaDrop && areaSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                      {areaSuggestions.map((s, i) => (
                        <button
                          key={`${s.name}-${i}`}
                          onMouseDown={() => pickArea(s)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(214,166,62,0.08)] transition-colors duration-200 text-left border-b border-gray-100 last:border-0"
                        >
                          <span className="text-gray-900 text-sm">{s.name}</span>
                          <span className="text-gray-400 text-xs">{s.hint}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[9px] text-gray-400 mt-0.5">Leave blank for a city-level estimate, or pick an exact area for area-specific pricing.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                {/* Property type */}
                <div>
                  <label className="label-dark">Property Type</label>
                  <div className="relative">
                    <select value={propType} onChange={(e) => {
                      setPropType(e.target.value);
                      const t = PROPERTY_TYPES.find((p) => p.value === e.target.value);
                      if (t) setUnit(t.defaultUnit);
                    }}
                      className="input-dark appearance-none pr-7 text-sm">
                      {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Area (for EMI) */}
                <div>
                  <label className="label-dark">Area <span className="normal-case text-gray-400 font-normal">(EMI)</span></label>
                  <input
                    type="number" value={area} min="1"
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="1200"
                    className="input-dark text-sm"
                  />
                </div>

                {/* Unit — region-aware local land units for plot/agriculture */}
                <div>
                  <label className="label-dark">Unit</label>
                  <div className="relative">
                    <select value={unit} onChange={(e) => setUnit(e.target.value)}
                      className="input-dark appearance-none pr-7 text-sm" style={{ minWidth: "90px" }}>
                      {BASE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                      {PLOT_LAND_TYPES.includes(propType) && (() => {
                        const localUnits = getRegionUnits(`${areaValue} ${cityValue}`);
                        if (!localUnits.length) return null;
                        return (
                          <>
                            <option disabled>── Local units ──</option>
                            {localUnits.map((u) => <option key={u.value} value={u.value}>{u.label} ★</option>)}
                          </>
                        );
                      })()}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {PLOT_LAND_TYPES.includes(propType) && (() => {
                    const localUnits = getRegionUnits(`${areaValue} ${cityValue}`);
                    const currentLocal = localUnits.find(u => u.value === unit);
                    return currentLocal
                      ? <p className="text-[9px] text-amber-600 mt-0.5">★ Local unit: 1 {currentLocal.label} {currentLocal.note}</p>
                      : localUnits.length > 0
                        ? <p className="text-[9px] text-amber-600 mt-0.5">★ Local units available for this region</p>
                        : null;
                  })()}
                </div>
              </div>

              {limitReached ? (
                <div className="mt-4">
                  <AiIntelRegisterGate
                    searchContext={`${areaValue ? `${areaValue}, ${cityValue}` : cityValue} (${PROPERTY_TYPES.find(t => t.value === propType)?.label ?? propType})`}
                    onUnlocked={() => { setLimitReached(false); analyze(); }}
                  />
                </div>
              ) : (
                <>
                  {error && (
                    <div className="flex items-start gap-2 text-red-600 text-sm mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                      {error.includes("WhatsApp") ? (
                        <a href="https://wa.me/917013016003" target="_blank" rel="noopener noreferrer"
                          className="ml-auto text-green-600 font-semibold whitespace-nowrap flex items-center gap-1 hover:underline">
                          <MessageCircle size={13} /> WhatsApp
                        </a>
                      ) : (
                        <button
                          onClick={analyze}
                          disabled={loading}
                          className="ml-auto text-red-700 font-semibold whitespace-nowrap flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}

                  <button onClick={analyze} disabled={loading}
                    className="btn-primary w-full justify-center mt-4 py-3.5 text-sm disabled:opacity-60">
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" />{LOADING_STEPS[loadStep]}</>
                      : <><Bot size={16} />Get Market Intelligence</>}
                  </button>

                  <p className="text-center text-gray-400 text-xs mt-3">
                    Works for any city or area worldwide · Powered by Gemini AI · Takes 5–10 seconds
                  </p>
                  {usage && !usage.loggedIn && (
                    <p className="text-center text-gray-400 text-[11px] mt-1">
                      {usage.registered ? "Unlimited searches unlocked" : `${usage.used} of ${usage.limit} free AI checks used`}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* ── Results ──────────────────────────────────────────────────── */}
            {r && (
              <div className="space-y-4">

                {/* Price + Trend Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">

                  {/* Top row: location + badges */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-5 border-b border-gray-200">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin size={14} style={{ color: "var(--gold-text)" }} />
                      <span className="text-gray-700 font-semibold">{r.locationName}</span>
                      <span className="text-gray-400 text-sm">·</span>
                      <span className="text-gray-500 text-sm capitalize">{propType}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {/* Live Gemini data (grounded in real Bayut/Tavily listings) is the only
                          source ever shown here now — a result only reaches this UI when
                          dataSource is "bayut_data" or "real_data". */}
                      {(r.dataSource === "bayut_data" || r.dataSource === "real_data") && (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                          style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.35)", color: "#16a34a" }}>
                          <Globe size={11} /> {r.dataSourceLabel ?? "AI estimate based on live web search"}
                        </span>
                      )}
                      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-semibold text-sm ${ts.bg} ${ts.border} ${ts.text}`}>
                        <span className="text-xs">{ts.icon}</span> {trend}
                      </div>
                    </div>
                  </div>

                  {/* Big price */}
                  <div className="mb-6">
                    <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-1 font-normal">
                      Current Price per {displayUnitLabel}
                    </h2>
                    <p className="text-5xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair,Georgia,serif)" }}>
                      {sym}{displayPrice.toLocaleString()}
                      <span className="text-xl text-gray-400 font-normal ml-2">
                        /{displayUnitLabel}
                      </span>
                    </p>
                    {r.priceRangeMin != null && r.priceRangeMax != null && (
                      <p className="text-gray-500 text-sm mt-1">
                        Realistic range: <span className="font-semibold text-gray-700">
                          {sym}{Math.round(toDisplay(r.priceRangeMin * unitConvFactor)).toLocaleString()} – {sym}{Math.round(toDisplay(r.priceRangeMax * unitConvFactor)).toLocaleString()}
                        </span> / {displayUnitLabel}
                      </p>
                    )}
                    {areaNum > 0 && (
                      <p className="text-gray-500 text-sm mt-1">
                        Estimated value for {areaNum.toLocaleString()} {UNIT_LABELS[unit] ?? unit}:
                        <span className="font-semibold text-gray-900 ml-1">{fmtPrice(propValue, sym, dispCurr)}</span>
                      </p>
                    )}
                    {r.rangeNote && (
                      <p className="text-amber-700 text-xs mt-2 leading-relaxed max-w-lg bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {r.rangeNote}
                      </p>
                    )}
                    {r.typicalListings && (
                      <p className="text-gray-400 text-xs mt-2 leading-relaxed max-w-lg">
                        <span className="font-semibold text-gray-500">Typical listings: </span>{r.typicalListings}
                      </p>
                    )}
                    {r.sourceUrls && r.sourceUrls.length > 0 && (
                      <p className="text-gray-400 text-[10px] mt-2 leading-relaxed max-w-lg">
                        <span className="font-semibold text-gray-500">Sources: </span>
                        {r.sourceUrls.map((u, i) => {
                          let host = u;
                          try { host = new URL(u).hostname.replace(/^www\./, ""); } catch { /* keep raw url */ }
                          return (
                            <span key={u}>
                              {i > 0 && ", "}
                              <a href={u} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">{host}</a>
                            </span>
                          );
                        })}
                      </p>
                    )}
                  </div>

                  {/* 4 stat cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Annual Growth",     val: `${r.growthRate}%`,          color: "text-green-600"  },
                      { label: "Rental Yield",      val: `${r.rentalYield}% p.a.`,    color: "text-[#7A5C1A]" },
                      { label: "Investment Rating", val: `${r.investmentRating}/10`,  color: ratingColor       },
                      { label: "Best For",          val: r.bestFor,                   color: "text-gray-700"   },
                    ].map((m) => (
                      <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                        <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">{m.label}</p>
                        <p className={`font-playfair font-bold text-sm leading-tight ${m.color}`}>
                          {m.val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Charts */}
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-1">
                  <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-amber-700 text-[11px] leading-relaxed">
                    <span className="font-semibold">Illustrative AI projection — not a verified historical record or a guaranteed forecast.</span>{" "}
                    Only today&apos;s current price (above) is grounded in live search data; the 5-year trend lines below are Gemini&apos;s modelled trajectory off that figure, for directional context only.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-normal flex items-center gap-2">
                      <Activity size={13} className="text-gray-400" />
                      5-Year Price History
                      <span className="ml-auto text-[10px] text-amber-600 flex items-center gap-1">
                        <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#7A5C1A" strokeWidth="2.5" /></svg>
                        Illustrative, not historical record
                      </span>
                    </h3>
                    <LineChart id="hist" points={r.priceHistory5yr.map(p => ({ year: p.year, value: Math.round(toDisplay(p.value * unitConvFactor)) }))} formatFn={fmtFn} />
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-normal flex items-center gap-2">
                      <ArrowUpRight size={13} style={{ color: "var(--gold-text)" }} />
                      5-Year Forecast
                      <span className="ml-auto text-[10px] text-amber-600 flex items-center gap-1">
                        <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#7A5C1A" strokeWidth="2.5" strokeDasharray="5 3" /></svg>
                        Illustrative projection
                      </span>
                    </h3>
                    <LineChart id="fore" points={r.priceForecast5yr.map(p => ({ year: p.year, value: Math.round(toDisplay(p.value * unitConvFactor)) }))} formatFn={fmtFn} dashed />
                    <p className="text-center text-gray-400 text-xs mt-1">
                      {r.priceForecast5yr[4]?.year} illustrative projection:
                      <span className="text-green-600 font-semibold ml-1">
                        {sym}{Math.round(toDisplay((r.priceForecast5yr[4]?.value ?? 0) * unitConvFactor)).toLocaleString()}/{displayUnitLabel}
                      </span>
                      <span className="text-green-500 ml-2">
                        (+{Math.round(((r.priceForecast5yr[4]?.value ?? 0) / r.currentPricePerSqft - 1) * 100)}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Bot size={16} style={{ color: "var(--gold-text)" }} />
                    <p className="text-gray-900 font-semibold text-sm">AI Market Analysis</p>
                    <span className="ml-auto text-[10px] text-gray-400 border border-gray-200 rounded px-2 py-0.5">Gemini AI</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-sm mb-5">{r.summary}</p>
                  <div className="space-y-2.5">
                    <p className="text-gray-900 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp size={12} style={{ color: "var(--gold-text)" }} /> Key Market Drivers
                    </p>
                    {r.keyDrivers.map((d, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle size={14} style={{ color: "var(--gold-text)" }} className="shrink-0 mt-0.5" />
                        <span className="text-gray-600 text-sm">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* EMI Calculator */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setShowEMI(!showEMI)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-900 font-semibold flex items-center gap-2 text-sm">
                      <Calculator size={16} style={{ color: "var(--gold-text)" }} /> EMI Calculator
                      {areaNum > 0 && (
                        <span className="text-gray-400 text-xs font-normal">
                          — based on {fmtPrice(propValue, sym, dispCurr)} estimate
                        </span>
                      )}
                    </span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${showEMI ? "rotate-180" : ""}`} />
                  </button>

                  {showEMI && (
                    <div className="px-6 pb-6 border-t border-gray-200">
                      <div className="grid sm:grid-cols-3 gap-4 mt-4 mb-5">
                        <div>
                          <label className="label-dark">Down Payment %</label>
                          <div className="flex items-center gap-3">
                            <input type="range" min="10" max="90" step="5" value={downPct}
                              onChange={(e) => setDownPct(Number(e.target.value))}
                              className="flex-1 accent-[#D6A63E]" />
                            <span className="text-gray-900 text-sm font-semibold w-10 text-right">{downPct}%</span>
                          </div>
                          <p className="text-gray-400 text-xs mt-1">Loan: {fmtPrice(loanAmt, sym, dispCurr)}</p>
                        </div>
                        <div>
                          <label className="label-dark">Interest Rate % p.a.</label>
                          <input type="number" value={intRate} step="0.25" min="1" max="30"
                            onChange={(e) => setIntRate(Number(e.target.value))}
                            className="input-dark text-sm" />
                        </div>
                        <div>
                          <label className="label-dark">Tenure (years)</label>
                          <div className="relative">
                            <select value={tenure} onChange={(e) => setTenure(Number(e.target.value))}
                              className="input-dark appearance-none pr-7 text-sm">
                              {[5, 10, 15, 20, 25, 30].map((y) => <option key={y} value={y}>{y} years</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {monthlyEMI > 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-xl p-4 text-center border"
                            style={{ background: "rgba(214,166,62,0.08)", borderColor: "rgba(214,166,62,0.3)" }}>
                            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Monthly EMI</p>
                            <p className="font-playfair font-bold text-xl" style={{ color: "var(--gold-text)" }}>
                              {fmtPrice(Math.round(monthlyEMI), sym, dispCurr)}
                            </p>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Total Interest</p>
                            <p className="font-playfair text-gray-900 font-bold text-xl">
                              {fmtPrice(Math.round(totalInt), sym, dispCurr)}
                            </p>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Total Payable</p>
                            <p className="font-playfair text-gray-900 font-bold text-xl">
                              {fmtPrice(Math.round(totalPay), sym, dispCurr)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm text-center py-2">
                          Enter area above to calculate EMI based on the estimated property value.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Local land unit note */}
                {isLocalUnit && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-gray-600 text-xs leading-relaxed">
                      <span className="text-amber-700 font-semibold">Local units: </span>
                      Price per {UNIT_LABELS[unit]} is converted from the underlying market data (priced per sq.yard) using standard ratios:
                      1 ankanam = 36 sqft, 1 cent = 435.6 sqft, 1 guntha = 1,089 sqft. These can vary slightly by region — verify locally.
                    </p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <AlertCircle size={14} className="text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-gray-500 text-xs leading-relaxed">
                    <span className="text-yellow-700 font-semibold">Disclaimer: </span>
                    AI-generated estimate based on
                    {r.dataSource === "bayut_data" ? " live Bayut.com listings" : r.dataSource === "real_data" ? " live web search" : " market trends"}{" "}
                    — not individual listing quotes, and actual prices vary. Asking prices typically run above final registered/closing prices.
                    {" "}Verify with a PropKnown advisor and RERA / DLD / relevant authority before making any investment decision.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Hot markets */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-gray-900 font-semibold text-sm mb-3 flex items-center gap-2">
                <Star size={13} fill="#7A5C1A" style={{ color: "var(--gold-text)" }} /> Popular Markets
              </p>
              <div className="flex flex-wrap gap-2">
                {HOT_MARKETS.map((m) => {
                  const isActive = citySelected === m.city && areaSelected === m.area;
                  return (
                    <button
                      key={`${m.city}-${m.area}`}
                      onClick={() => pickHotMarket(m)}
                      className="text-xs px-2.5 py-1.5 rounded-full border transition-all"
                      style={isActive
                        ? { background: "var(--gold)", color: "var(--navy)", borderColor: "var(--gold)", fontWeight: "600" }
                        : { borderColor: "#d1d5db", color: "#6b7280" }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.borderColor = "#7A5C1A";
                          (e.currentTarget as HTMLElement).style.color = "#7A5C1A";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.borderColor = "#d1d5db";
                          (e.currentTarget as HTMLElement).style.color = "#6b7280";
                        }
                      }}
                    >
                      {m.area}, {m.city}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-gray-900 font-semibold text-sm mb-3 flex items-center gap-2">
                <Bot size={14} style={{ color: "var(--gold-text)" }} /> How It Works
              </p>
              <div className="space-y-3">
                {[
                  { n: "1", t: "Type any location", d: "Any city, area or neighbourhood worldwide" },
                  { n: "2", t: "AI analysis runs", d: "Gemini generates realistic market estimates" },
                  { n: "3", t: "Get full report", d: "Price trends, forecast, yield, rating & summary" },
                  { n: "4", t: "Plan your move", d: "Use the EMI calc to model your investment" },
                ].map((s) => (
                  <div key={s.n} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black shrink-0 mt-0.5"
                      style={{ background: "var(--gold)" }}>{s.n}</span>
                    <div>
                      <p className="text-gray-900 text-xs font-semibold">{s.t}</p>
                      <p className="text-gray-400 text-xs">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unit Converter */}
            <UnitConverter />

            {/* Coverage stats */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-gray-900 font-semibold text-sm mb-4 flex items-center gap-2">
                <Activity size={14} style={{ color: "var(--gold-text)" }} /> Coverage
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "Global", l: "Any Location" },
                  { v: "AI",     l: "Powered"      },
                  { v: "10+",    l: "Currencies"   },
                  { v: "~10s",   l: "Per Analysis" },
                ].map((s) => (
                  <div key={s.l} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-200">
                    <p className="font-playfair font-bold text-lg" style={{ color: "var(--gold-text)" }}>{s.v}</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead form */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-gray-900 font-semibold text-sm mb-1">Talk to an Expert</p>
              <p className="text-gray-400 text-xs mb-4">AI gives you data. Our experts help you act on it.</p>
              <LeadForm source="ai-intelligence" title="" subtitle="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIIntelligencePage() {
  return (
    <Suspense fallback={null}>
      <AIIntelligenceInner />
    </Suspense>
  );
}
