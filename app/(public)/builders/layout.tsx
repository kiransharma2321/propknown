import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For Builders & Developers",
  description:
    "Partner with PropKnown to market and sell your real estate projects in Hyderabad. Access verified buyers, AI-powered pricing, digital marketing, and PropKnown's trusted brand. RERA-compliant channel partnerships.",
  openGraph: {
    title: "Builder & Developer Partnerships | PropKnown",
    description:
      "Reach verified buyers, leverage AI pricing, and close faster. PropKnown's builder partnership programme — RERA-compliant, results-driven.",
  },
};

export default function BuildersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
