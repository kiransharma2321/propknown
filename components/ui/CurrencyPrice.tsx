"use client";

import { useCurrency } from "@/components/ui/CurrencyToggle";
import { formatCurrency, toINR, type CurrencyCode } from "@/lib/currency";

interface Props {
  priceINR: number;
  /** Currency the raw `priceINR` amount is actually denominated in, if not INR (e.g. Dubai listings priced in AED). */
  sourceCurrency?: string;
  className?: string;
}

const KNOWN_CODES = ["INR", "AED", "GBP", "USD", "SGD"];

export default function CurrencyPrice({ priceINR, sourceCurrency, className = "text-gold-400 font-bold text-lg" }: Props) {
  const { currency } = useCurrency();
  const from = sourceCurrency && KNOWN_CODES.includes(sourceCurrency) ? (sourceCurrency as CurrencyCode) : "INR";
  const baseINR = from === "INR" ? priceINR : toINR(priceINR, from);
  return <span className={className}>{formatCurrency(baseINR, currency)}</span>;
}
