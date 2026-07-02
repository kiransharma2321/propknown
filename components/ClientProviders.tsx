"use client";

import type { ReactNode } from "react";
import { ComparisonProvider } from "./comparison/ComparisonContext";
import ComparisonTray from "./comparison/ComparisonTray";
import { CurrencyProvider } from "./ui/CurrencyToggle";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <ComparisonProvider>
        {children}
        <ComparisonTray />
      </ComparisonProvider>
    </CurrencyProvider>
  );
}
