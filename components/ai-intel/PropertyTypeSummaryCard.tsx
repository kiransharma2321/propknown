import { CheckCircle2 } from "lucide-react";

// Plain presentational component -- no hooks, no "use client" -- so it renders correctly from
// both a Server Component (app/(public)/ai-intelligence/[city]/[area]/page.tsx, the crawlable
// hot-market overview) and a Client Component (the "Get Full Location Overview" results grid on
// app/(public)/ai-intelligence/page.tsx), without visual drift between the two surfaces.
//
// Deliberately scoped to price + range + sources + the honesty disclaimer + trend, per the
// approved plan -- no charts or EMI calculator here; those stay exclusive to the full
// single-type interactive tool.

const TREND_STYLE: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  Bullish:  { bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  icon: "▲" },
  Stable:   { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", icon: "→" },
  Cautious: { bg: "bg-red-50",    border: "border-red-300",    text: "text-red-700",    icon: "▼" },
};

export interface PropertyTypeSummaryData {
  available?:          boolean;
  message?:            string;
  locationName?:        string;
  currencySymbol?:      string;
  currentPricePerSqft?: number;
  pricePerSqftUnit?:    string;
  priceRangeMin?:       number;
  priceRangeMax?:       number;
  rangeNote?:           string;
  sourceUrls?:          string[];
  trend?:               string;
  dataSourceLabel?:     string;
}

const UNIT_LABEL: Record<string, string> = {
  sqft: "sq.ft", sqyard: "sq.yard", acres: "acre", sqm: "sq.m",
};

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function PropertyTypeSummaryCard({
  propertyTypeLabel,
  data,
}: {
  propertyTypeLabel: string;
  data: PropertyTypeSummaryData;
}) {
  if (!data || data.available === false) {
    return (
      <div className="card-dark p-5">
        <h3 className="heading-h3 text-lg mb-1">{propertyTypeLabel}</h3>
        <p className="text-gray-400 text-sm">
          {data?.message || "Live market data is temporarily unavailable for this type. Please try again in a moment."}
        </p>
      </div>
    );
  }

  const ts = TREND_STYLE[data.trend ?? "Stable"] ?? TREND_STYLE.Stable;
  const unitLabel = UNIT_LABEL[data.pricePerSqftUnit ?? "sqft"] ?? data.pricePerSqftUnit ?? "sq.ft";
  const sym = data.currencySymbol ?? "";

  return (
    <div className="card-dark p-5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="heading-h3 text-lg">{propertyTypeLabel}</h3>
        {data.trend && (
          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${ts.bg} ${ts.border} ${ts.text}`}>
            {ts.icon} {data.trend}
          </span>
        )}
      </div>

      <p className="font-playfair text-2xl font-bold" style={{ color: "var(--gold-text)" }}>
        {sym}{Math.round(data.currentPricePerSqft ?? 0).toLocaleString()}
        <span className="text-sm font-normal text-gray-400">/{unitLabel}</span>
      </p>

      {data.priceRangeMin != null && data.priceRangeMax != null && (
        <p className="text-gray-500 text-xs mt-1">
          Realistic range: {sym}{Math.round(data.priceRangeMin).toLocaleString()} – {sym}{Math.round(data.priceRangeMax).toLocaleString()}/{unitLabel}
        </p>
      )}

      {data.rangeNote && (
        <p className="text-amber-700 text-[11px] leading-relaxed mt-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          {data.rangeNote}
        </p>
      )}

      {data.sourceUrls && data.sourceUrls.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500 mt-2">
          <CheckCircle2 size={12} className="text-green-600 shrink-0" />
          Sources: {data.sourceUrls.slice(0, 4).map(hostnameOf).join(", ")}
        </div>
      )}

      <p className="text-gray-400 text-[11px] leading-relaxed mt-2 italic">
        &quot;{data.dataSourceLabel || "AI estimate based on live web search"} — verify the specific property before deciding.&quot;
      </p>
    </div>
  );
}
