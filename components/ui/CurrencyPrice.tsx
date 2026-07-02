"use client";

import { useCurrency } from "@/components/ui/CurrencyToggle";
import { formatCurrency } from "@/lib/currency";

interface Props {
  priceINR: number;
  className?: string;
}

export default function CurrencyPrice({ priceINR, className = "text-gold-400 font-bold text-lg" }: Props) {
  const { currency } = useCurrency();
  return <span className={className}>{formatCurrency(priceINR, currency)}</span>;
}
