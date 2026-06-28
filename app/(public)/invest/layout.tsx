import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Property Investment Opportunities",
  description:
    "Discover high-yield property investment opportunities in Hyderabad and globally. HMDA plots, AI-scored apartments, NRI-friendly options, Kokapet villas, Gachibowli flats. PropKnown curates only RERA-verified, legally clear assets.",
  keywords: [
    "property investment Hyderabad 2026", "HMDA plot investment", "Kokapet real estate",
    "NRI property investment India", "high yield rental property", "PropKnown invest",
    "real estate ROI Hyderabad", "Financial District apartments",
  ],
  openGraph: {
    title: "Property Investment Opportunities — RERA Verified | PropKnown",
    description:
      "AI-scored, RERA-verified investment properties. Kokapet, Gachibowli, Financial District & beyond. Average 20-30% appreciation in 3 years.",
  },
};

export default function InvestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
