import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "AI Real Estate Market Intelligence",
  description:
    "Get AI-powered real estate price estimates for any location in India. Enter your area, property type, and size to get current price per sqft, year-on-year growth, market trend, and investment outlook — powered by Gemini AI and live web data.",
  alternates: { canonical: "https://www.propknown.com/ai-intelligence" },
  keywords: [
    "property price Hyderabad", "real estate AI valuation", "Kokapet price per sqft",
    "Gachibowli property rates 2026", "HMDA plot price", "agriculture land price Telangana",
    "AI property valuation India", "market intelligence real estate",
  ],
  openGraph: {
    title: "AI Real Estate Market Intelligence | PropKnown",
    description:
      "Instant AI-powered price estimates for any India location. Powered by Gemini 2.5 + live Tavily web data. RERA-indicative only.",
    images: [OG_IMAGE],
  },
};

export default function AIIntelligenceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
