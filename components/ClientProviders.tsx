"use client";

import type { ReactNode } from "react";
import { ComparisonProvider } from "./comparison/ComparisonContext";
import ComparisonTray from "./comparison/ComparisonTray";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ComparisonProvider>
      {children}
      <ComparisonTray />
    </ComparisonProvider>
  );
}
