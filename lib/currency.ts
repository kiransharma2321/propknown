"use client";

export type CurrencyCode = "INR" | "AED" | "GBP" | "USD" | "SGD";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
  rateFromINR: number; // 1 INR = ? foreign currency
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹",  label: "Indian Rupee",    flag: "🇮🇳", rateFromINR: 1 },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham",     flag: "🇦🇪", rateFromINR: 0.0437 },
  { code: "GBP", symbol: "£",  label: "British Pound",   flag: "🇬🇧", rateFromINR: 0.0095 },
  { code: "USD", symbol: "$",  label: "US Dollar",       flag: "🇺🇸", rateFromINR: 0.012 },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar", flag: "🇸🇬", rateFromINR: 0.016 },
];

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyInfo> = Object.fromEntries(
  CURRENCIES.map(c => [c.code, c])
) as Record<CurrencyCode, CurrencyInfo>;

export function convertPrice(priceINR: number, to: CurrencyCode): number {
  const rate = CURRENCY_MAP[to]?.rateFromINR ?? 1;
  return priceINR * rate;
}

export function formatCurrency(priceINR: number, to: CurrencyCode): string {
  const info = CURRENCY_MAP[to];
  if (!info) return `₹${priceINR.toLocaleString("en-IN")}`;
  const converted = convertPrice(priceINR, to);
  if (to === "INR") {
    if (converted >= 1e7) return `₹${(converted / 1e7).toFixed(2)} Cr`;
    if (converted >= 1e5) return `₹${(converted / 1e5).toFixed(2)} L`;
    return `₹${converted.toLocaleString("en-IN")}`;
  }
  // Foreign
  if (converted >= 1e6) return `${info.symbol}${(converted / 1e6).toFixed(2)}M`;
  if (converted >= 1e3) return `${info.symbol}${(converted / 1e3).toFixed(1)}K`;
  return `${info.symbol}${converted.toFixed(0)}`;
}
