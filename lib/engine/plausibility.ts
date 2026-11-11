// General plausibility rules for every published price (areas and projects, every city and type).
// Used by the engine on the way out (lib/engine/index.ts) and by the broad accuracy suite
// (lib/accuracyRules.ts), so the site and the tests apply the same rules. Nothing is
// special-cased for a particular area or project.

// Plausible asking-price bands per currency + unit. Very wide on purpose: they catch unit /
// currency mix-ups, rents and parsing errors, not "expensive" areas.
const SQFT: Record<string, [number, number]> = {
  INR: [1_000, 200_000], AED: [300, 15_000], GBP: [100, 5_000], SGD: [300, 8_000], CAD: [100, 3_000], USD: [50, 3_000],
};
const PER_SQFT: Record<string, number> = { sqft: 1, sqyard: 9, sqm: 10.764 };
// Land sold per acre (agricultural / farm land) has its own band -- far below urban sq.ft rates.
const ACRE: Record<string, [number, number]> = {
  INR: [200_000, 500_000_000], AED: [500_000, 500_000_000], GBP: [5_000, 50_000_000], SGD: [50_000, 500_000_000], CAD: [2_000, 50_000_000], USD: [2_000, 50_000_000],
};

export function plausibleBand(currency: string, unit: string): [number, number] | null {
  if (unit === "acres" || unit === "acre") return ACRE[currency] ?? null;
  const k = PER_SQFT[unit], b = SQFT[currency];
  return k && b ? [b[0] * k, b[1] * k] : null;
}

export function isPlausiblePrice(price: number, currency: string, unit: string): boolean {
  const band = plausibleBand(currency, unit);
  return !band || (price >= band[0] && price <= band[1]);
}

// A published range must contain the typical price and be at most this many times wide;
// otherwise it is mixing in other property types, rents or outliers and isn't shown.
export const MAX_RANGE_RATIO = 4;
export function isUsableRange(price: number, min?: number | null, max?: number | null): boolean {
  if (!(Number(min) > 0) || !(Number(max) > 0)) return false;
  return Number(min) <= price && price <= Number(max) && Number(max) / Number(min) <= MAX_RANGE_RATIO;
}
