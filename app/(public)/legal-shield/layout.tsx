import type { Metadata } from "next";
import { OG_IMAGE } from "@/app/layout";

export const metadata: Metadata = {
  title: "Legal Shield — Fraud & Red-Flag Property Checker",
  description:
    "Free fraud and red-flag checker for Indian real estate listings. Spot common scam signals, compare asking price against the market, and verify any RERA registration number against your state's official portal.",
  openGraph: {
    title: "PropKnown Legal Shield — Fraud & Red-Flag Checker",
    description:
      "Enter what you know about a listing and get an honest, plain-language check for common Indian real estate scam signals, plus direct links to verify RERA numbers officially.",
    images: [OG_IMAGE],
  },
};

export default function LegalShieldLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
