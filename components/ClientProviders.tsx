"use client";

import type { ReactNode } from "react";
import { ComparisonProvider } from "./comparison/ComparisonContext";
import ComparisonTray from "./comparison/ComparisonTray";
import { CurrencyProvider } from "./ui/CurrencyToggle";
import { BuyerProvider } from "./buyer/BuyerProvider";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <BuyerProvider>
        <ComparisonProvider>
          {children}
          <ComparisonTray />
        </ComparisonProvider>
      </BuyerProvider>
    </CurrencyProvider>
  );
}
