import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

// title/description live in page.tsx (same segment, always wins) -- not repeated here.
// keywords IS kept: page.tsx doesn't define its own, so this one is what actually applies.
export const metadata: Metadata = {
  alternates: { canonical: "https://www.propknown.com/invest" },
  keywords: [
    "property investment Hyderabad 2026", "HMDA plot investment", "Kokapet real estate",
    "NRI property investment India", "high yield rental property", "PropKnown invest",
    "real estate ROI Hyderabad", "Financial District apartments",
  ],
  openGraph: {
    title: "Property Investment Opportunities — RERA Verified | PropKnown",
    description:
      "AI-scored, RERA-verified investment properties. Kokapet, Gachibowli, Financial District & beyond. Average 20-30% appreciation in 3 years.",
    images: [OG_IMAGE],
  },
};

export default function InvestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
