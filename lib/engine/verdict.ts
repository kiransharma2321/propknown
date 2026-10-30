import { unitLabel, type EngineResult } from "@/lib/engine";

export type Verdict = "fair" | "overpriced" | "underpriced";

// Shared verdict logic -- also used by the self-serve listing flow (/list-property) so an
// owner's asking price is judged exactly the way a buyer's Price Check would judge it.
export function priceVerdict(pricePerUnit: number, market: EngineResult): { verdict: Verdict; message: string; min: number; max: number } {
  const now = Number(market.currentPricePerSqft);
  const min = Number(market.priceRangeMin) || now;
  const max = Number(market.priceRangeMax) || now;
  const sym = String(market.currencySymbol ?? "");
  const u = unitLabel(market.pricePerSqftUnit as string);
  const fmt = (n: number) => `${sym}${Math.round(n).toLocaleString("en-IN")}`;
  const range = `${fmt(min)}–${fmt(max)}/${u}`;
  const where = String(market.locationName ?? "this area");
  if (pricePerUnit > max) {
    const pct = Math.round(((pricePerUnit - now) / now) * 100);
    return { verdict: "overpriced", min, max, message: `This works out to ${fmt(pricePerUnit)}/${u}, about ${pct}% above the current realistic rate for ${where} (${range}). Worth negotiating or asking the seller to justify the premium.` };
  }
  if (pricePerUnit < min) {
    const pct = Math.round(((now - pricePerUnit) / now) * 100);
    return { verdict: "underpriced", min, max, message: `This works out to ${fmt(pricePerUnit)}/${u}, about ${pct}% below the current realistic rate for ${where} (${range}). Could be a genuine deal — but verify the title and legal status carefully, since an unusually low price can also signal a problem.` };
  }
  return { verdict: "fair", min, max, message: `This works out to ${fmt(pricePerUnit)}/${u}, within the current realistic range for ${where} (${range}).` };
}
