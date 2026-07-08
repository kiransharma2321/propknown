import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Price Reality Check — Is That Property Overpriced?",
  description:
    "Find out instantly if a property's asking price is overpriced or underpriced. Enter the location, size, and price to compare it against PropKnown's live AI market analysis — free, no signup required for your first checks.",
  openGraph: {
    title: "PropKnown Price Reality Check — Is That Price Fair?",
    description:
      "Compare any asking price against live AI market analysis in seconds. Backed by the same engine behind PropKnown AI Intelligence — never a blind guess.",
    images: [OG_IMAGE],
  },
};

export default function PriceCheckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
